import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ locale: string; slug: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { locale, slug } = await params
    if (!locale || !slug) {
      return NextResponse.json(
        { error: 'Locale ve slug parametreleri gereklidir' },
        { status: 400 }
      )
    }

    // Find product id by slug using raw SQL to avoid client type regen dependency
    let rows: Array<{ id: string }> = await prisma.$queryRawUnsafe(
      `SELECT id FROM "Product" WHERE slug = $1 AND status = 'ACTIVE' LIMIT 1`,
      slug
    )
    let id = rows?.[0]?.id
    // Fallback: if not found by slug, try direct id match for backward compatibility
    if (!id) {
      rows = await prisma.$queryRawUnsafe(
        `SELECT id FROM "Product" WHERE id = $1 AND status = 'ACTIVE' LIMIT 1`,
        slug
      )
      id = rows?.[0]?.id
    }
    if (!id) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    // Fetch product with translations for the specific locale
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            translations: { where: { locale } }
          }
        },
        translations: { where: { locale } },
        reviews: {
          include: {
            user: { select: { name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    const translation = product.translations[0]
    const categoryTranslation = product.category.translations[0]

    const parsedImages = Array.isArray(product.images)
      ? (product.images as any)
      : (() => { try { return JSON.parse(product.images || '[]') } catch { return [] } })()

    return NextResponse.json({
      ...product,
      name: translation?.name || product.name,
      description: translation?.description || product.description,
      images: parsedImages,
      category: {
        ...product.category,
        name: categoryTranslation?.name || product.category.name,
      }
    })
  } catch (error) {
    console.error('Product by slug fetch error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}