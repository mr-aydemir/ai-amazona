import { prisma } from '@/lib/prisma'
import { translateToEnglish } from '@/lib/translate'
import { slugify } from '@/lib/slugify'
import { promises as fs } from 'fs'

type TrendyolAttribute = {
  attributeId?: number
  attributeName?: string
  attributeValue?: string | number | boolean
  attributeValueId?: number
}

type TrendyolProductItem = {
  id?: string | number
  productId?: string | number
  productMainId?: string | number
  categoryName?: string
  attributes?: TrendyolAttribute[]
}

type TrendyolFilePayload = {
  content?: TrendyolProductItem[]
}

function detectType(val: unknown): 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'TEXT' {
  const s = String(val ?? '').trim()
  if (!s) return 'TEXT'
  const lower = s.toLowerCase()
  if (['true', 'false', 'evet', 'hayır', 'hayir'].includes(lower)) return 'BOOLEAN'
  const num = Number(s.replace(/,/g, '.'))
  if (Number.isFinite(num)) return 'NUMBER'
  return 'SELECT'
}

async function getCategoryAncestors(categoryId: string): Promise<string[]> {
  const ids: string[] = []
  let cur: string | null = categoryId
  while (cur) {
    const c = await prisma.category.findUnique({ where: { id: cur }, select: { id: true, parentId: true } })
    if (!c) break
    ids.push(c.id)
    cur = c.parentId ?? null
  }
  return ids // from child up to root
}

async function resolveCanonicalCategory(categoryId: string): Promise<string> {
  // Prefer ancestor with slug '3d-baski' if exists, otherwise use topmost ancestor
  const chain: { id: string; slug: string | null; parentId: string | null }[] = []
  let cur: string | null = categoryId
  while (cur) {
    const c = await prisma.category.findUnique({ where: { id: cur }, select: { id: true, slug: true, parentId: true } })
    if (!c) break
    chain.push(c)
    cur = c.parentId
  }
  const target = chain.find((c) => (c.slug || '').toLowerCase() === '3d-baski') || chain[chain.length - 1] || chain[0]
  return target.id
}

async function ensureCanonicalAttribute(categoryId: string, trName: string, sampleValue: unknown) {
  // Search same-name attribute across ancestors, prefer canonical/root
  const ancestors = await getCategoryAncestors(categoryId)
  const existing = await prisma.attribute.findFirst({
    where: {
      categoryId: { in: ancestors },
      translations: { some: { locale: 'tr', name: trName } },
    },
  })
  if (existing) return existing
  const type = detectType(sampleValue)
  const canonicalCategoryId = await resolveCanonicalCategory(categoryId)
  const keyBase = slugify(trName)
  let key = keyBase || `attr-${Date.now()}`
  let i = 2
  while (true) {
    const count = await prisma.attribute.count({ where: { categoryId: canonicalCategoryId, key } })
    if (count === 0) break
    key = `${keyBase}-${i++}`
  }
  const enName = await translateToEnglish(trName)
  const created = await prisma.attribute.create({
    data: {
      categoryId: canonicalCategoryId,
      key,
      type,
      active: true,
      filterable: type === 'SELECT' || type === 'BOOLEAN',
      translations: {
        create: [
          { locale: 'tr', name: trName },
          { locale: 'en', name: enName || trName },
        ],
      },
    },
  })
  return created
}

async function ensureOption(attributeId: string, trValue: string) {
  const existing = await prisma.attributeOption.findFirst({
    where: {
      attributeId,
      translations: { some: { locale: 'tr', name: trValue } },
    },
  })
  if (existing) return existing
  const keyBase = slugify(trValue)
  let key = keyBase || undefined
  if (key) {
    let i = 2
    while (true) {
      const count = await prisma.attributeOption.count({ where: { attributeId, key } })
      if (count === 0) break
      key = `${keyBase}-${i++}`
    }
  }
  const enValue = await translateToEnglish(trValue)
  const created = await prisma.attributeOption.create({
    data: {
      attributeId,
      key,
      translations: {
        create: [
          { locale: 'tr', name: trValue },
          { locale: 'en', name: enValue || trValue },
        ],
      },
    },
  })
  return created
}

async function run() {
  const argFileFlag = process.argv.find((a) => a.startsWith('--file='))
  const fileFromFlag = argFileFlag ? argFileFlag.split('=')[1] : undefined
  const fileFromArg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : undefined
  const defaultPath = 'd://YazilimProgramlama//ai-amazona//trendyol-products-2025-10-29T14-31-45-316Z.json'
  const filePath = fileFromFlag || fileFromArg || defaultPath

  console.log(`▶️ Trendyol attribute import başlıyor. Kaynak: ${filePath}`)
  let products: TrendyolProductItem[] = []
  try {
    const text = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(text) as TrendyolFilePayload
    products = Array.isArray(parsed?.content) ? parsed.content : []
  } catch (e) {
    console.error('❌ Dosya okunamadı veya JSON formatı geçersiz:', e)
    return
  }

  if (!products.length) {
    console.log('ℹ️ İçerikte ürün bulunamadı (content). İşlem sonlandırılıyor.')
    return
  }

  let processed = 0
  let skipped = 0
  let createdAttributes = 0
  let createdOptions = 0
  let upsertedValues = 0

  for (const item of products) {
    try {
      const productId = String(item.id ?? item.productId ?? item.productMainId ?? '')
      if (!productId) { skipped++; continue }
      const product = await prisma.product.findUnique({ where: { id: productId } })
      if (!product) { skipped++; continue }

      const categoryId = product.categoryId
      const attrs = Array.isArray(item.attributes) ? item.attributes : []
      if (attrs.length === 0) { processed++; continue }

      for (const a of attrs) {
        const trName = String(a.attributeName ?? '').trim()
        if (!trName) continue
        const valueRaw = a.attributeValue

        const ancestors = await getCategoryAncestors(categoryId)
        const beforeAttrCount = await prisma.attribute.count({
          where: { categoryId: { in: ancestors }, translations: { some: { locale: 'tr', name: trName } } },
        })
        const attribute = await ensureCanonicalAttribute(categoryId, trName, valueRaw)
        if (beforeAttrCount === 0) createdAttributes++

        const t = attribute.type
        if (t === 'NUMBER') {
          const num = Number(String(valueRaw ?? '').replace(/,/g, '.'))
          if (!Number.isFinite(num)) continue
          await prisma.productAttributeValue.upsert({
            where: { productId_attributeId: { productId, attributeId: attribute.id } },
            update: { valueNumber: num, attributeOptionId: null, valueText: null, valueBoolean: null },
            create: { productId, attributeId: attribute.id, valueNumber: num },
          })
          upsertedValues++
        } else if (t === 'BOOLEAN') {
          const s = String(valueRaw ?? '').toLowerCase()
          const bool = s === 'true' || s === 'evet'
          await prisma.productAttributeValue.upsert({
            where: { productId_attributeId: { productId, attributeId: attribute.id } },
            update: { valueBoolean: bool, attributeOptionId: null, valueText: null, valueNumber: null },
            create: { productId, attributeId: attribute.id, valueBoolean: bool },
          })
          upsertedValues++
        } else if (t === 'SELECT') {
          const valStr = String(valueRaw ?? '').trim()
          if (!valStr) continue
          const beforeOptCount = await prisma.attributeOption.count({
            where: { attributeId: attribute.id, translations: { some: { locale: 'tr', name: valStr } } },
          })
          const option = await ensureOption(attribute.id, valStr)
          if (beforeOptCount === 0) createdOptions++
          await prisma.productAttributeValue.upsert({
            where: { productId_attributeId: { productId, attributeId: attribute.id } },
            update: { attributeOptionId: option.id, valueText: null, valueNumber: null, valueBoolean: null },
            create: { productId, attributeId: attribute.id, attributeOptionId: option.id },
          })
          upsertedValues++
        } else {
          const valStr = String(valueRaw ?? '').trim()
          await prisma.productAttributeValue.upsert({
            where: { productId_attributeId: { productId, attributeId: attribute.id } },
            update: { valueText: valStr, attributeOptionId: null, valueNumber: null, valueBoolean: null },
            create: { productId, attributeId: attribute.id, valueText: valStr },
          })
          upsertedValues++
        }
      }

      processed++
    } catch (err) {
      console.error('⚠️ Ürün işleme hatası:', err)
      skipped++
    }
  }

  console.log('✅ Trendyol attribute import tamamlandı', {
    processed,
    skipped,
    createdAttributes,
    createdOptions,
    upsertedValues,
  })
}

run()
  .catch((e) => {
    console.error('❌ Script hatası:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })