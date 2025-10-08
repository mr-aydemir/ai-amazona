import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ locale: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { locale } = await params

    // Find About page by slug, create empty if missing to simplify flow
    let page = await prisma.aboutPage.findFirst({ where: { slug: 'about' } })
    if (!page) {
      page = await prisma.aboutPage.create({ data: { slug: 'about' } })
    }

    const translation = await prisma.aboutPageTranslation.findUnique({
      where: {
        aboutPageId_locale: { aboutPageId: page.id, locale },
      },
    })

    return NextResponse.json({
      about: {
        id: page.id,
        locale,
        contentHtml: translation?.contentHtml || null,
      },
    })
  } catch (error) {
    console.error('[ABOUT_PUBLIC_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch about content' }, { status: 500 })
  }
}