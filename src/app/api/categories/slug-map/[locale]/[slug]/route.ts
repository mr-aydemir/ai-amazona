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

    // Resolve category id from translation-based slug, legacy global slug, or direct id
    const t = await prisma.categoryTranslation.findFirst({ where: { locale, slug } })
    let id = t?.categoryId
    if (!id) {
      const c = await prisma.category.findFirst({ where: { slug }, select: { id: true } })
      id = c?.id
    }
    if (!id) {
      const c2 = await prisma.category.findFirst({ where: { id: slug }, select: { id: true } })
      id = c2?.id
    }
    if (!id) {
      return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 })
    }

    // Fetch translation slugs for all locales
    const translations = await prisma.categoryTranslation.findMany({
      where: { categoryId: id },
      select: { locale: true, slug: true },
      orderBy: { locale: 'asc' },
    })

    const slugs: Record<string, string | null> = {}
    for (const tr of translations) {
      const normalized = (tr.locale || '').split('-')[0]
      slugs[normalized] = tr.slug || null
    }

    // Include legacy global category.slug as a fallback
    const c3 = await prisma.category.findUnique({ where: { id }, select: { slug: true } })

    return NextResponse.json({ categoryId: id, slugs, legacySlug: c3?.slug || null })
  } catch (error) {
    console.error('Category slug-map fetch error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}