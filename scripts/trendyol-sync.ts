import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { getCurrencyData, convertServer } from '@/lib/server-currency'
import { uniqueSlug } from '@/lib/slugify'
import { translateToEnglish } from '@/lib/translate'

type TrendyolProduct = {
  id?: string | number
  productMainId?: string | number
  barcode?: string
  title?: string
  salePrice?: number
  listPrice?: number
  quantity?: number
  approved?: boolean
  onSale?: boolean
}

type TrendyolPage = {
  page: number
  size: number
  totalElements: number
  totalPages: number
  content?: TrendyolProduct[]
  items?: TrendyolProduct[]
}

type Args = {
  ratio: number
  size: number
  limit: number | null
  delayMs: number
  dryRun: boolean
  updateStatus: boolean
  updateOriginalPrice: boolean
  addNew: boolean
  translate: boolean
}

function parseArgs(argv: string[]): Args {
  const get = (name: string) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`))
    return hit ? hit.slice(name.length + 3) : undefined
  }
  const ratio = Number(get('ratio') ?? '1')
  const size = Number(get('size') ?? '100')
  const limitRaw = get('limit')
  const delayMs = Number(get('delay') ?? '500')
  return {
    ratio: Number.isFinite(ratio) && ratio > 0 ? ratio : 1,
    size: Math.min(Math.max(Number.isFinite(size) ? size : 100, 1), 200),
    limit: limitRaw ? Number(limitRaw) : null,
    delayMs: Number.isFinite(delayMs) ? delayMs : 500,
    dryRun: argv.includes('--dry-run'),
    updateStatus: argv.includes('--update-status'),
    updateOriginalPrice: argv.includes('--update-original-price'),
    addNew: argv.includes('--add-new'),
    translate: argv.includes('--translate'),
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const PLACEHOLDER_IMAGE = '/images/placeholder.jpg'

function imagesJson(item: TrendyolProduct): string {
  const raw = (item as { images?: Array<{ url?: string }> }).images
  const urls = Array.isArray(raw) ? raw.map((i) => i?.url).filter((u): u is string => !!u) : []
  return JSON.stringify(urls.length ? urls : [PLACEHOLDER_IMAGE])
}

async function safeSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = await uniqueSlug(base, exists)
  if (slug) return slug
  slug = `item-${Date.now().toString(36)}`
  while (await exists(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  return slug
}

async function getOrCreateCategory(
  name: string,
  cache: Map<string, string>,
  translate: boolean
): Promise<string> {
  const hit = cache.get(name)
  if (hit) return hit

  const found = await prisma.category.findUnique({ where: { name } })
  if (found) {
    cache.set(name, found.id)
    return found.id
  }

  const trSlug = await safeSlug(
    name,
    async (c) =>
      (await prisma.category.count({
        where: { OR: [{ slug: c }, { translations: { some: { locale: 'tr', slug: c } } }] },
      })) > 0
  )
  const enName = translate ? await translateToEnglish(name) : name
  const enSlug = await safeSlug(
    enName || name,
    async (c) =>
      (await prisma.category.count({ where: { translations: { some: { locale: 'en', slug: c } } } })) > 0
  )

  const created = await prisma.category.create({
    data: {
      name,
      description: name,
      image: PLACEHOLDER_IMAGE,
      slug: trSlug,
      translations: {
        create: [
          { locale: 'tr', name, description: name, slug: trSlug },
          { locale: 'en', name: enName || name, description: enName || name, slug: enSlug },
        ],
      },
    },
  })
  cache.set(name, created.id)
  return created.id
}

async function createNewProducts(
  items: TrendyolProduct[],
  args: Args,
  baseCurrency: string,
  rates: { currency: string; rate: number }[]
) {
  const categoryCache = new Map<string, string>()
  let created = 0
  let passive = 0
  let failed = 0
  let i = 0

  for (const item of items) {
    i++
    const id = String(item.id ?? '')
    if (!id) continue
    try {
      const salePrice = Number(item.salePrice)
      if (!Number.isFinite(salePrice)) {
        failed++
        continue
      }

      const name = String(item.title ?? 'Ürün').slice(0, 200)
      const description = String((item as { description?: string }).description ?? name).replace(/;\s*/g, '\n')
      const price = round2(convertServer(salePrice, 'TRY', baseCurrency, rates) * args.ratio)
      const stock = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0
      const status: 'ACTIVE' | 'INACTIVE' =
        item.onSale && item.approved !== false && salePrice > 0 ? 'ACTIVE' : 'INACTIVE'
      const categoryName = String((item as { categoryName?: string }).categoryName ?? 'Genel').trim() || 'Genel'
      const categoryId = await getOrCreateCategory(categoryName, categoryCache, args.translate)

      const listPrice = Number(item.listPrice)
      const originalPrice =
        args.updateOriginalPrice && Number.isFinite(listPrice) && listPrice > salePrice
          ? round2(convertServer(listPrice, 'TRY', baseCurrency, rates) * args.ratio)
          : undefined

      const slug = await safeSlug(name, async (c) => (await prisma.product.count({ where: { slug: c } })) > 0)
      const trSlug = await safeSlug(
        name,
        async (c) => (await prisma.productTranslation.count({ where: { locale: 'tr', slug: c } })) > 0
      )
      const enName = args.translate ? await translateToEnglish(name) : name
      const enDescription = args.translate ? await translateToEnglish(description) : description
      const enSlug = await safeSlug(
        enName || name,
        async (c) => (await prisma.productTranslation.count({ where: { locale: 'en', slug: c } })) > 0
      )

      await prisma.$transaction(async (tx) => {
        await tx.product.create({
          data: {
            id,
            name,
            description,
            price,
            stock,
            images: imagesJson(item),
            categoryId,
            status,
            slug,
            ...(originalPrice !== undefined ? { originalPrice } : {}),
          },
        })
        await tx.productTranslation.create({
          data: { productId: id, locale: 'tr', name, description, slug: trSlug },
        })
        await tx.productTranslation.create({
          data: {
            productId: id,
            locale: 'en',
            name: enName || name,
            description: enDescription || description,
            slug: enSlug,
          },
        })
      })

      created++
      if (status === 'INACTIVE') passive++
    } catch (e) {
      failed++
      console.error(`  ⚠️ Eklenemedi ${id}:`, e instanceof Error ? e.message : e)
    }
    if (i % 10 === 0 || i === items.length) console.log(`  ✓ ${i}/${items.length}`)
  }

  return { created, failed, passive }
}

async function fetchPage(page: number, size: number): Promise<TrendyolPage> {
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID
  const apiKey = process.env.TRENDYOL_API_KEY
  const apiSecret = process.env.TRENDYOL_API_SECRET

  if (!supplierId || !apiKey || !apiSecret) {
    throw new Error('TRENDYOL_SUPPLIER_ID / TRENDYOL_API_KEY / TRENDYOL_API_SECRET tanımlı değil (.env)')
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const userAgent = process.env.TRENDYOL_USER_AGENT || `${supplierId} - SelfIntegration`
  const headers = {
    Authorization: `Basic ${auth}`,
    'User-Agent': userAgent,
    Accept: 'application/json',
  }

  const urls = [
    `https://api.trendyol.com/integration/product/sellers/${supplierId}/products?page=${page}&size=${size}`,
    `https://apigw.trendyol.com/integration/product/sellers/${supplierId}/products?page=${page}&size=${size}`,
  ]

  let lastError = ''
  for (const url of urls) {
    const res = await fetch(url, { headers })
    if (res.ok) return (await res.json()) as TrendyolPage
    lastError = `${res.status} ${res.statusText} (${url})`
    if (res.status !== 403 && res.status !== 404) break
  }
  throw new Error(`Trendyol API hatası: ${lastError}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log(
    `▶️ Trendyol senkron | ratio=${args.ratio} size=${args.size} dryRun=${args.dryRun}` +
      (args.limit ? ` limit=${args.limit}` : '')
  )

  const { baseCurrency, rates } = await getCurrencyData()
  console.log(`ℹ️ Sistem para birimi: ${baseCurrency}`)

  const all: TrendyolProduct[] = []
  let page = 0
  let totalPages = 1
  let totalElements = 0

  while (page < totalPages) {
    const data = await fetchPage(page, args.size)
    totalPages = data.totalPages ?? 1
    totalElements = data.totalElements ?? 0
    const items = data.content ?? data.items ?? []
    all.push(...items)
    console.log(`  • sayfa ${page + 1}/${totalPages} → ${items.length} ürün (toplam ${all.length}/${totalElements})`)
    if (!items.length) break
    if (args.limit && all.length >= args.limit) break
    page++
    if (page < totalPages && args.delayMs > 0) await sleep(args.delayMs)
  }

  const items = args.limit ? all.slice(0, args.limit) : all
  console.log(`\n📦 Trendyol'dan ${items.length} ürün alındı.`)

  const ids = items.map((p) => String(p.id ?? '')).filter(Boolean)
  const existing = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, price: true, originalPrice: true, stock: true, status: true },
  })
  const existingMap = new Map(existing.map((p) => [p.id, p]))

  type Change = {
    id: string
    name: string
    oldPrice: number
    newPrice: number
    oldStock: number
    newStock: number
    oldOriginal: number | null
    newOriginal: number | null
    newStatus?: 'ACTIVE' | 'INACTIVE'
  }

  const changes: Change[] = []
  const newItems: TrendyolProduct[] = []
  let notInDb = 0
  let unchanged = 0

  for (const item of items) {
    const id = String(item.id ?? '')
    if (!id) continue
    const row = existingMap.get(id)
    if (!row) {
      notInDb++
      if (args.addNew) newItems.push(item)
      continue
    }

    const salePrice = Number(item.salePrice)
    if (!Number.isFinite(salePrice)) continue

    const newPrice = round2(convertServer(salePrice, 'TRY', baseCurrency, rates) * args.ratio)
    const newStock = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0

    const listPrice = Number(item.listPrice)
    const newOriginal =
      args.updateOriginalPrice && Number.isFinite(listPrice) && listPrice > salePrice
        ? round2(convertServer(listPrice, 'TRY', baseCurrency, rates) * args.ratio)
        : row.originalPrice

    const newStatus =
      args.updateStatus && typeof item.onSale === 'boolean'
        ? item.onSale && item.approved !== false
          ? 'ACTIVE'
          : 'INACTIVE'
        : undefined

    const priceChanged = Math.abs(row.price - newPrice) > 0.009
    const stockChanged = row.stock !== newStock
    const originalChanged =
      args.updateOriginalPrice && (newOriginal ?? null) !== (row.originalPrice ?? null)
    const statusChanged = newStatus !== undefined && newStatus !== row.status

    if (!priceChanged && !stockChanged && !originalChanged && !statusChanged) {
      unchanged++
      continue
    }

    changes.push({
      id,
      name: row.name,
      oldPrice: row.price,
      newPrice,
      oldStock: row.stock,
      newStock,
      oldOriginal: row.originalPrice,
      newOriginal: newOriginal ?? null,
      newStatus,
    })
  }

  const priceChanges = changes.filter((c) => Math.abs(c.oldPrice - c.newPrice) > 0.009).length
  const stockChanges = changes.filter((c) => c.oldStock !== c.newStock).length

  console.log(`\n📊 Eşleşen: ${existing.length} | DB'de yok: ${notInDb} | Değişmeyen: ${unchanged} | Güncellenecek: ${changes.length}`)
  console.log(`   Fiyat değişimi: ${priceChanges} | Stok değişimi: ${stockChanges}`)

  if (changes.length) {
    console.log('\n🔎 İlk 15 değişiklik:')
    for (const c of changes.slice(0, 15)) {
      const price = `₺${c.oldPrice.toFixed(2)} → ₺${c.newPrice.toFixed(2)}`
      const stock = `stok ${c.oldStock} → ${c.newStock}`
      console.log(`  - ${c.name.slice(0, 55)} | ${price} | ${stock}`)
    }
    if (changes.length > 15) console.log(`  ... ve ${changes.length - 15} ürün daha`)
  }

  let addResult: { created: number; failed: number; passive: number } | null = null

  if (args.addNew && newItems.length) {
    console.log(`\n🆕 Yeni ürün modu: ${newItems.length} ürün DB'ye eklenecek`)
    if (args.dryRun) {
      for (const it of newItems.slice(0, 10)) {
        console.log(`  + ${String(it.title ?? '').slice(0, 60)} | ₺${Number(it.salePrice ?? 0).toFixed(2)}`)
      }
      if (newItems.length > 10) console.log(`  ... ve ${newItems.length - 10} ürün daha`)
    } else {
      addResult = await createNewProducts(newItems, args, baseCurrency, rates)
    }
  } else if (args.addNew) {
    console.log('\n🆕 Yeni ürün modu: eklenecek yeni ürün yok.')
  }

  if (args.dryRun) {
    console.log('\n🧪 --dry-run: veritabanına yazılmadı.')
    return
  }

  let updated = 0
  let failed = 0
  const chunkSize = 25
  for (let i = 0; i < changes.length; i += chunkSize) {
    const chunk = changes.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(async (c) => {
        const data: Record<string, unknown> = { price: c.newPrice, stock: c.newStock }
        if (c.newOriginal !== null && args.updateOriginalPrice) data.originalPrice = c.newOriginal
        if (c.newStatus) data.status = c.newStatus
        try {
          await prisma.product.update({ where: { id: c.id }, data })
          updated++
        } catch (e) {
          failed++
          console.error(`⚠️ Güncellenemedi: ${c.id}`, e instanceof Error ? e.message : e)
        }
      })
    )
    console.log(`  ✓ ${Math.min(i + chunkSize, changes.length)}/${changes.length}`)
  }

  console.log(
    `\n✅ Bitti. Güncellenen: ${updated} | Hata: ${failed} | Toplam: ${items.length}` +
      (addResult
        ? ` | Yeni eklenen: ${addResult.created} (pasif: ${addResult.passive}) | Ekleme hatası: ${addResult.failed}`
        : '')
  )
}

main()
  .catch((e) => {
    console.error('❌ Senkron hatası:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
