import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrencyData, convertServer } from '@/lib/server-currency'
import { translateToEnglish } from '@/lib/translate'
import { uniqueSlug, slugify } from '@/lib/slugify'

type TrendyolImage = { url?: string }
type TrendyolProduct = {
  id?: string | number
  productId?: string | number
  productMainId?: string | number
  title?: string
  name?: string
  description?: string
  salePrice?: number
  quantity?: number
  categoryName?: string
  images?: TrendyolImage[]
  attributes?: Array<{
    attributeId?: number
    attributeName?: string
    attributeValue?: string | number | boolean
    attributeValueId?: number
    customAttributeValue?: string
  }>
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

    const body = await request.json()
    const products: TrendyolProduct[] = Array.isArray(body?.products) ? body.products : []
    const ratioRaw = body?.ratio
    const ratio = typeof ratioRaw === 'number' ? ratioRaw : parseFloat(String(ratioRaw ?? '1'))
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return NextResponse.json({ error: 'Geçerli bir oran giriniz' }, { status: 400 })
    }

    const skipExistingRaw = body?.skipExisting
    const skipExisting =
      typeof skipExistingRaw === 'boolean'
        ? skipExistingRaw
        : skipExistingRaw == null || String(skipExistingRaw).trim() === ''
          ? true
          : String(skipExistingRaw).toLowerCase() === 'true'

    const { baseCurrency, rates } = await getCurrencyData()

    let created = 0
    let updated = 0
    let skipped = 0

    const placeholderImage = '/images/placeholder.jpg'

    // Helpers for EAV attributes
    const detectType = (val: unknown): 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'TEXT' => {
      const s = String(val ?? '').trim()
      if (!s) return 'TEXT'
      const lower = s.toLowerCase()
      if (['true', 'false', 'evet', 'hayır', 'hayir'].includes(lower)) return 'BOOLEAN'
      const num = Number(s.replace(/,/g, '.'))
      if (Number.isFinite(num)) return 'NUMBER'
      return 'SELECT'
    }

    const ensureAttribute = async (categoryId: string, trName: string, sampleValue: unknown) => {
      const existing = await prisma.attribute.findFirst({
        where: { categoryId, translations: { some: { locale: 'tr', name: trName } } },
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
      })
      return created
    }

    const ensureOption = async (attributeId: string, trValue: string) => {
      const existing = await prisma.attributeOption.findFirst({
        where: { attributeId, translations: { some: { locale: 'tr', name: trValue } } },
      })
      if (existing) return existing
      const keyBase = slugify(trValue)
      let key: string | undefined = keyBase || undefined
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

    for (const p of products) {
      try {
        const productId = String(p.id ?? p.productId ?? p.productMainId ?? '')
        if (!productId) continue

        // Ensure category exists (by name)
        const categoryName = p.categoryName?.trim() || 'Genel'
        let category = await prisma.category.findUnique({ where: { name: categoryName } })
        if (!category) {
          category = await prisma.category.create({
            data: { name: categoryName, description: categoryName, image: placeholderImage },
          })
        }

        const name = (p.title ?? p.name ?? 'Ürün').slice(0, 200)
        const description = (p.description ?? '').toString()

        const tryPrice = typeof p.salePrice === 'number' ? p.salePrice : 0
        // Convert from TRY to system base currency, then apply ratio
        const baseConverted = convertServer(tryPrice, 'TRY', baseCurrency, rates)
        const finalPrice = Math.max(0, baseConverted * ratio)

        const stock = Number.isFinite(p.quantity as number) ? (p.quantity as number) : 0
        const imagesArray = (p.images ?? [])
          .map((img) => img?.url)
          .filter((url): url is string => !!url)
        const imagesJson = JSON.stringify(imagesArray.length > 0 ? imagesArray : [placeholderImage])

        const existing = await prisma.product.findUnique({ where: { id: productId } })
        let didCreateOrUpdate = false
        if (existing && skipExisting) {
          skipped += 1
        } else if (existing) {
          // If product exists, update fields and ensure slug is present
          const slugUpdate: { slug?: string } = {}
          if (!existing.slug) {
            const genSlug = await uniqueSlug(name, async (candidate) => {
              const count = await prisma.product.count({ where: { slug: candidate } })
              return count > 0
            })
            slugUpdate.slug = genSlug
          }

          await prisma.product.update({
            where: { id: productId },
            data: {
              name,
              description,
              price: finalPrice,
              stock,
              images: imagesJson,
              categoryId: category.id,
              status: 'ACTIVE',
              ...slugUpdate,
            },
          })
          // TR translation with slug
          const existingTr = await prisma.productTranslation.findUnique({
            where: { productId_locale: { productId, locale: 'tr' } },
          })
          const trSlug = existingTr?.slug
            ? existingTr.slug
            : await uniqueSlug(name, async (candidate) => {
              const count = await prisma.productTranslation.count({ where: { locale: 'tr', slug: candidate } })
              return count > 0
            })
          await prisma.productTranslation.upsert({
            where: { productId_locale: { productId, locale: 'tr' } },
            update: { name, description, slug: trSlug },
            create: { productId, locale: 'tr', name, description, slug: trSlug },
          })
          const nameEn = await translateToEnglish(name)
          const descriptionEn = await translateToEnglish(description)
          // EN translation with slug
          const existingEn = await prisma.productTranslation.findUnique({
            where: { productId_locale: { productId, locale: 'en' } },
          })
          const enSlug = existingEn?.slug
            ? existingEn.slug
            : await uniqueSlug(nameEn, async (candidate) => {
              const count = await prisma.productTranslation.count({ where: { locale: 'en', slug: candidate } })
              return count > 0
            })
          await prisma.productTranslation.upsert({
            where: { productId_locale: { productId, locale: 'en' } },
            update: { name: nameEn, description: descriptionEn, slug: enSlug },
            create: { productId, locale: 'en', name: nameEn, description: descriptionEn, slug: enSlug },
          })
          updated += 1
          didCreateOrUpdate = true
        } else {
          // Create product with generated unique slug
          const genSlug = await uniqueSlug(name, async (candidate) => {
            const count = await prisma.product.count({ where: { slug: candidate } })
            return count > 0
          })

          await prisma.product.create({
            data: {
              id: productId,
              name,
              description,
              price: finalPrice,
              stock,
              images: imagesJson,
              categoryId: category.id,
              status: 'ACTIVE',
              slug: genSlug,
            },
          })
          // TR translation with slug
          const trSlug2 = await uniqueSlug(name, async (candidate) => {
            const count = await prisma.productTranslation.count({ where: { locale: 'tr', slug: candidate } })
            return count > 0
          })
          await prisma.productTranslation.upsert({
            where: { productId_locale: { productId, locale: 'tr' } },
            update: { name, description, slug: trSlug2 },
            create: { productId, locale: 'tr', name, description, slug: trSlug2 },
          })
          const nameEn = await translateToEnglish(name)
          const descriptionEn = await translateToEnglish(description)
          // EN translation with slug
          const enSlug2 = await uniqueSlug(nameEn, async (candidate) => {
            const count = await prisma.productTranslation.count({ where: { locale: 'en', slug: candidate } })
            return count > 0
          })
          await prisma.productTranslation.upsert({
            where: { productId_locale: { productId, locale: 'en' } },
            update: { name: nameEn, description: descriptionEn, slug: enSlug2 },
            create: { productId, locale: 'en', name: nameEn, description: descriptionEn, slug: enSlug2 },
          })
          created += 1
          didCreateOrUpdate = true
        }

        // Process product attributes (Trendyol attributes -> EAV)
        try {
          const attrs = Array.isArray((p as any).attributes) ? (p as any).attributes : []
          if (attrs.length > 0) {
            for (const a of attrs) {
              const trName = String(a.attributeName ?? '').trim()
              if (!trName) continue
              const valueRaw = a.customAttributeValue ?? a.attributeValue
              const attribute = await ensureAttribute(category.id, trName, valueRaw)
              const t = attribute.type
              const productIdStr = productId
              if (t === 'NUMBER') {
                const num = Number(String(valueRaw ?? '').replace(/,/g, '.'))
                if (!Number.isFinite(num)) continue
                await prisma.productAttributeValue.upsert({
                  where: { productId_attributeId: { productId: productIdStr, attributeId: attribute.id } },
                  update: { valueNumber: num, attributeOptionId: null, valueText: null, valueBoolean: null },
                  create: { productId: productIdStr, attributeId: attribute.id, valueNumber: num },
                })
              } else if (t === 'BOOLEAN') {
                const s = String(valueRaw ?? '').toLowerCase()
                const bool = s === 'true' || s === 'evet'
                await prisma.productAttributeValue.upsert({
                  where: { productId_attributeId: { productId: productIdStr, attributeId: attribute.id } },
                  update: { valueBoolean: bool, attributeOptionId: null, valueText: null, valueNumber: null },
                  create: { productId: productIdStr, attributeId: attribute.id, valueBoolean: bool },
                })
              } else if (t === 'SELECT') {
                const valStr = String(valueRaw ?? '').trim()
                if (!valStr) continue
                const option = await ensureOption(attribute.id, valStr)
                await prisma.productAttributeValue.upsert({
                  where: { productId_attributeId: { productId: productIdStr, attributeId: attribute.id } },
                  update: { attributeOptionId: option.id, valueText: null, valueNumber: null, valueBoolean: null },
                  create: { productId: productIdStr, attributeId: attribute.id, attributeOptionId: option.id },
                })
              } else {
                const valStr = String(valueRaw ?? '').trim()
                await prisma.productAttributeValue.upsert({
                  where: { productId_attributeId: { productId: productIdStr, attributeId: attribute.id } },
                  update: { valueText: valStr, attributeOptionId: null, valueNumber: null, valueBoolean: null },
                  create: { productId: productIdStr, attributeId: attribute.id, valueText: valStr },
                })
              }
            }
          }
        } catch (attrErr) {
          console.error('Attribute processing error:', attrErr)
        }
      } catch (err) {
        // Skip individual product errors, continue with others
        console.error('Import item error:', err)
      }
    }

    return NextResponse.json({ message: 'Import tamamlandı', created, updated, skipped, total: products.length })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}