import 'dotenv/config'
import { chromium, type Page } from 'playwright'
import { prisma } from '@/lib/prisma'

type Args = {
  limit: number | null
  pageSize: number
  delayMs: number
  dryRun: boolean
  maxPagesPerProduct: number
}

type TrendyolProductRef = {
  productId: string
  contentId: string
  title: string
  url: string
}

type TyReview = {
  id: number
  rate: number
  comment?: string | null
  userFullName?: string | null
  createdAt?: number
}

type ReviewPageResult = {
  status: number
  json?: {
    result?: {
      summary?: { totalCommentCount?: number; totalPages?: number; averageRating?: number }
      reviews?: TyReview[]
    }
  }
  text?: string
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function parseArgs(argv: string[]): Args {
  const get = (name: string) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`))
    return hit ? hit.slice(name.length + 3) : undefined
  }
  const limitRaw = get('limit')
  const pageSize = Number(get('pageSize') ?? '50')
  const delay = Number(get('delay') ?? '300')
  const maxPages = Number(get('max-pages') ?? '10')
  return {
    limit: limitRaw ? Number(limitRaw) : null,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 50) : 50,
    delayMs: Number.isFinite(delay) ? delay : 300,
    dryRun: argv.includes('--dry-run'),
    maxPagesPerProduct: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 10,
  }
}

async function fetchTrendyolProducts(): Promise<TrendyolProductRef[]> {
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID
  const apiKey = process.env.TRENDYOL_API_KEY
  const apiSecret = process.env.TRENDYOL_API_SECRET
  if (!supplierId || !apiKey || !apiSecret) {
    throw new Error('TRENDYOL_SUPPLIER_ID / TRENDYOL_API_KEY / TRENDYOL_API_SECRET tanımlı değil (.env)')
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const headers = {
    Authorization: `Basic ${auth}`,
    'User-Agent': `${supplierId} - SelfIntegration`,
    Accept: 'application/json',
  }

  const refs: TrendyolProductRef[] = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const res = await fetch(
      `https://api.trendyol.com/integration/product/sellers/${supplierId}/products?page=${page}&size=200`,
      { headers }
    )
    if (!res.ok) throw new Error(`Trendyol ürün API hatası: ${res.status}`)
    const json = await res.json()
    totalPages = json.totalPages ?? 1
    for (const item of json.content ?? []) {
      const contentId = /-p-(\d+)/.exec(item.productUrl || '')?.[1]
      if (!contentId || !item.id) continue
      refs.push({
        productId: String(item.id),
        contentId,
        title: String(item.title ?? ''),
        url: String(item.productUrl).split('?')[0],
      })
    }
    console.log(`  • ürün sayfası ${page + 1}/${totalPages} → toplam ${refs.length} referans`)
    page++
  }
  return refs
}

async function fetchReviewsPage(
  page: Page,
  contentId: string,
  pageNo: number,
  pageSize: number
): Promise<ReviewPageResult> {
  return page.evaluate(
    async ({ contentId, pageNo, pageSize }) => {
      const url = `https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/review-read/product-reviews/detailed?contentId=${contentId}&page=${pageNo}&pageSize=${pageSize}&channelId=1`
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'include' })
        const text = await res.text()
        try {
          return { status: res.status, json: JSON.parse(text) }
        } catch {
          return { status: res.status, text: text.slice(0, 200) }
        }
      } catch (error) {
        return { status: 0, text: error instanceof Error ? error.message : 'fetch failed' }
      }
    },
    { contentId, pageNo, pageSize }
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log(
    `▶️ Trendyol yorum senkronu | pageSize=${args.pageSize} delay=${args.delayMs}ms dryRun=${args.dryRun}` +
      (args.limit ? ` limit=${args.limit}` : '')
  )

  const refsAll = await fetchTrendyolProducts()
  const refs = args.limit ? refsAll.slice(0, args.limit) : refsAll
  console.log(`\n📦 ${refs.length} ürün için yorum sorgulanacak`)

  const dbProducts = await prisma.product.findMany({
    where: { id: { in: refs.map((r) => r.productId) } },
    select: { id: true },
  })
  const dbIds = new Set(dbProducts.map((p) => p.id))

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const context = await browser.newContext({
    locale: 'tr-TR',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 900 },
  })
  const page = await context.newPage()

  const firstUrl = refs[0]?.url
  if (firstUrl) {
    console.log('🌐 Trendyol oturumu hazırlanıyor...')
    await page.goto(firstUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(3000)
  }

  let productsChecked = 0
  let productsWithReviews = 0
  let reviewsSeen = 0
  let upserted = 0
  let created = 0
  let updated = 0
  let skippedNoDb = 0
  let errors = 0
  const seenSources = new Map<string, number>()

  for (const ref of refs) {
    productsChecked++
    if (!dbIds.has(ref.productId)) {
      skippedNoDb++
      continue
    }

    try {
      let pageNo = 0
      let totalPages = 1
      let productReviews = 0

      while (pageNo < totalPages && pageNo < args.maxPagesPerProduct) {
        let result = await fetchReviewsPage(page, ref.contentId, pageNo, args.pageSize)

        if (result.status === 403 || result.status === 0) {
          // Cloudflare oturumu düşmüş olabilir; sayfayı yenileyip tekrar dene
          await page.goto(ref.url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
          await page.waitForTimeout(2500)
          result = await fetchReviewsPage(page, ref.contentId, pageNo, args.pageSize)
        }

        if (result.status !== 200 || !result.json?.result) break

        const summary = result.json.result.summary
        const reviews = result.json.result.reviews ?? []
        if (pageNo === 0) {
          totalPages = summary?.totalPages ?? 1
          if ((summary?.totalCommentCount ?? 0) > 0) {
            productsWithReviews++
            console.log(
              `  💬 ${ref.title.slice(0, 45)} | ${summary?.totalCommentCount} yorum | ort. ${summary?.averageRating}`
            )
          }
        }

        for (const review of reviews) {
          if (!review?.id || typeof review.rate !== 'number') continue
          productReviews++
          reviewsSeen++
          const comment = typeof review.comment === 'string' ? review.comment.trim() : ''
          const createdAt = review.createdAt ? new Date(review.createdAt) : new Date()
          const guestName = review.userFullName?.trim() || null

          if (args.dryRun) continue

          const existing = await prisma.review.findUnique({
            where: { source_externalId: { source: 'TRENDYOL', externalId: String(review.id) } },
            select: { id: true },
          })

          await prisma.review.upsert({
            where: { source_externalId: { source: 'TRENDYOL', externalId: String(review.id) } },
            update: {
              rating: review.rate,
              comment: comment || null,
              guestName,
              productId: ref.productId,
              createdAt,
            },
            create: {
              source: 'TRENDYOL',
              externalId: String(review.id),
              rating: review.rate,
              comment: comment || null,
              guestName,
              productId: ref.productId,
              createdAt,
            },
          })
          upserted++
          if (existing) updated++
          else created++
        }

        pageNo++
        if (pageNo < totalPages && pageNo < args.maxPagesPerProduct) await sleep(args.delayMs)
      }

      if (productReviews > 0) seenSources.set(ref.productId, productReviews)
    } catch (error) {
      errors++
      console.error(`  ⚠️ ${ref.title.slice(0, 40)}:`, error instanceof Error ? error.message : error)
    }

    if (productsChecked % 25 === 0) {
      console.log(`  ✓ ${productsChecked}/${refs.length} ürün kontrol edildi`)
    }
    if (args.delayMs > 0) await sleep(args.delayMs)
  }

  await browser.close()

  console.log('\n📊 Özet')
  console.log(`  Kontrol edilen ürün: ${productsChecked}`)
  console.log(`  Yorum bulunan ürün: ${productsWithReviews}`)
  console.log(`  Görülen yorum: ${reviewsSeen}`)
  if (!args.dryRun) {
    console.log(`  Kaydedilen: ${upserted} (yeni: ${created}, güncellenen: ${updated})`)
  } else {
    console.log('  🧪 dry-run: veritabanına yazılmadı')
  }
  console.log(`  DB'de olmayan ürün: ${skippedNoDb} | Hata: ${errors}`)
}

main()
  .catch((error) => {
    console.error('❌ Yorum senkron hatası:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
