import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
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

async function ensureAttribute(categoryId: string, trName: string, sampleValue: unknown) {
  const existing = await prisma.attribute.findFirst({
    where: {
      categoryId,
      translations: { some: { locale: 'tr', name: trName } },
    },
    include: { translations: true },
  })
  if (existing) return existing
  const type = detectType(sampleValue)
  const keyBase = slugify(trName)
  let key = keyBase || `attr-${Date.now()}`
  let i = 2
  while (true) {
    const count = await prisma.attribute.count({ where: { categoryId, key } })
    if (count === 0) break
    key = `${keyBase}-${i++}`
  }
  const enName = await translateToEnglish(trName)
  const created = await prisma.attribute.create({
    data: {
      categoryId,
      key,
      type,
      active: true,
      translations: {
        create: [
          { locale: 'tr', name: trName },
          { locale: 'en', name: enName || trName },
        ],
      },
    },
    include: { translations: true },
  })
  return created
}

async function ensureOption(attributeId: string, trValue: string) {
  const existing = await prisma.attributeOption.findFirst({
    where: {
      attributeId,
      translations: { some: { locale: 'tr', name: trValue } },
    },
    include: { translations: true },
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
    include: { translations: true },
  })
  return created
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const productsInput: TrendyolProductItem[] = Array.isArray(body?.products) ? body.products : []
    const filePath: string | undefined = typeof body?.filePath === 'string' ? body.filePath : undefined

    let products: TrendyolProductItem[] = productsInput
    if ((!products || products.length === 0) && filePath) {
      try {
        const text = await fs.readFile(filePath, 'utf-8')
        const parsed = JSON.parse(text) as TrendyolFilePayload
        if (Array.isArray(parsed?.content)) {
          products = parsed.content
        }
      } catch (err) {
        return NextResponse.json({ error: 'Veri dosyası okunamadı' }, { status: 400 })
      }
    }
    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'Ürün verisi bulunamadı' }, { status: 400 })
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

          const attribute = await ensureAttribute(categoryId, trName, valueRaw)
          if (attribute.createdAt.getTime() === attribute.updatedAt.getTime()) {
            // newly created
            createdAttributes++
          }

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
            const option = await ensureOption(attribute.id, valStr)
            if (option.createdAt.getTime() === option.updatedAt.getTime()) {
              createdOptions++
            }
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
        // Skip per-item error
        skipped++
      }
    }

    return NextResponse.json({
      message: 'Trendyol attribute import tamamlandı',
      processed,
      skipped,
      createdAttributes,
      createdOptions,
      upsertedValues,
    })
  } catch (error) {
    console.error('Import attributes error:', error)
    return NextResponse.json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}