import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrencyData, convertServer } from '@/lib/server-currency'
import { translateToEnglish } from '@/lib/translate'
import { uniqueSlug } from '@/lib/slugify'

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
        if (existing && skipExisting) {
          skipped += 1
          continue
        }
        if (existing) {
          // If product exists, update fields and ensure slug is present
          let slugUpdate: { slug?: string } = {}
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
          await prisma.productTranslation.upsert({
            where: { productId_locale: { productId, locale: 'tr' } },
            update: { name, description },
            create: { productId, locale: 'tr', name, description },
          })
          const nameEn = await translateToEnglish(name)
          const descriptionEn = await translateToEnglish(description)
          await prisma.productTranslation.upsert({
            where: { productId_locale: { productId, locale: 'en' } },
            update: { name: nameEn, description: descriptionEn },
            create: { productId, locale: 'en', name: nameEn, description: descriptionEn },
          })
          updated += 1
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
          await prisma.productTranslation.upsert({
            where: { productId_locale: { productId, locale: 'tr' } },
            update: { name, description },
            create: { productId, locale: 'tr', name, description },
          })
          const nameEn = await translateToEnglish(name)
          const descriptionEn = await translateToEnglish(description)
          await prisma.productTranslation.upsert({
            where: { productId_locale: { productId, locale: 'en' } },
            update: { name: nameEn, description: descriptionEn },
            create: { productId, locale: 'en', name: nameEn, description: descriptionEn },
          })
          created += 1
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