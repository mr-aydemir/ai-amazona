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

    // Resolve product id from locale+slug, legacy global slug, or direct id fallback
    const t = await prisma.productTranslation.findFirst({ where: { locale, slug } })
    let id = t?.productId
    if (!id) {
      const p = await prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true } })
      id = p?.id
    }
    if (!id) {
      const p2 = await prisma.product.findFirst({ where: { id: slug, status: 'ACTIVE' }, select: { id: true } })
      id = p2?.id
    }
    if (!id) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    // Fetch translation slugs for all locales
    const translations = await prisma.productTranslation.findMany({
      where: { productId: id },
      select: { locale: true, slug: true },
      orderBy: { locale: 'asc' },
    })

    const slugs: Record<string, string | null> = {}
    for (const tr of translations) {
      const normalized = (tr.locale || '').split('-')[0]
      slugs[normalized] = tr.slug || null
    }

    // Include legacy global product.slug as a fallback
    const p3 = await prisma.product.findUnique({ where: { id }, select: { slug: true } })

    return NextResponse.json({ productId: id, slugs, legacySlug: p3?.slug || null })
  } catch (error) {
    console.error('Product slug-map fetch error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}