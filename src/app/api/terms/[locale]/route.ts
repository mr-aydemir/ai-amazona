import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeRichHtml } from '@/lib/sanitize-html'

interface RouteParams {
  params: Promise<{ locale: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { locale } = await params

    let page = await prisma.termsPage.findFirst({ where: { slug: 'terms' } })
    if (!page) {
      page = await prisma.termsPage.create({ data: { slug: 'terms' } })
    }

    const translation = await prisma.termsPageTranslation.findUnique({
      where: { termsPageId_locale: { termsPageId: page.id, locale } },
    })

    const content = sanitizeRichHtml(translation?.contentHtml || '')
    return NextResponse.json({
      terms: {
        id: page.id,
        locale,
        contentHtml: content || null,
      },
    })
  } catch (error) {
    console.error('[TERMS_PUBLIC_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch terms content' }, { status: 500 })
  }
}