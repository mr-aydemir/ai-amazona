import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locale = searchParams.get('locale') || undefined

    // Öncelik: istenen locale için çevirisi olan aktif bannerlar
    const withLocale = locale
      ? await prisma.banner.findMany({
          where: {
            active: true,
            translations: {
              some: { locale },
            },
          },
          include: {
            translations: { where: { locale } },
          },
          orderBy: { sortOrder: 'asc' },
        })
      : []

    let banners = withLocale

    // Fallback: istenen locale yoksa aktif bannerları döndür, varsa ilgili çevirileri ekle
    if (!banners || banners.length === 0) {
      banners = await prisma.banner.findMany({
        where: { active: true },
        include: locale
          ? { translations: { where: { locale } } }
          : { translations: true },
        orderBy: { sortOrder: 'asc' },
      })
    }

    const result = banners.map((b) => {
      const t = b.translations?.[0]
      return {
        id: b.id,
        image: b.image,
        linkUrl: b.linkUrl,
        sortOrder: b.sortOrder,
        active: b.active,
        title: t?.title,
        description: t?.description,
      }
    })

    return NextResponse.json({ banners: result })
  } catch (error) {
    console.error('[BANNERS_API] Failed to fetch banners:', error)
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 })
  }
}