import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeRichHtml } from '@/lib/sanitize-html'

interface RouteParams {
  params: Promise<{ locale: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { locale } = await params

    // Find Privacy page by slug, create empty if missing to simplify flow
    let page = await prisma.page.findUnique({ where: { slug: 'privacy' } })
    if (!page) {
      page = await prisma.page.create({ data: { slug: 'privacy' } })
    }

    const translation = await prisma.pageTranslation.findUnique({
      where: {
        pageId_locale: { pageId: page.id, locale },
      },
    })

    const content = sanitizeRichHtml(translation?.contentHtml || '')
    return NextResponse.json({
      privacy: {
        id: page.id,
        locale,
        contentHtml: content || null,
      },
    })
  } catch (error) {
    console.error('[PRIVACY_PUBLIC_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch privacy content' }, { status: 500 })
  }
}