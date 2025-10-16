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

    // Prefer translation-based slug per locale
    const t = await prisma.productTranslation.findFirst({ where: { locale, slug } })
    let id = t?.productId
    // Fallback: legacy global product.slug
    if (!id) {
      const p = await prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true } })
      id = p?.id
    }
    // Fallback: treat slug as direct product id (backward compatibility)
    if (!id) {
      const p2 = await prisma.product.findFirst({ where: { id: slug, status: 'ACTIVE' }, select: { id: true } })
      id = p2?.id
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