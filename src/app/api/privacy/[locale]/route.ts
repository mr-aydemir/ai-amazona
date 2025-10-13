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
    let page = await prisma.privacyPage.findFirst({ where: { slug: 'privacy' } })
    if (!page) {
      page = await prisma.privacyPage.create({ data: { slug: 'privacy' } })
    }

    const translation = await prisma.privacyPageTranslation.findUnique({
      where: {
        privacyPageId_locale: { privacyPageId: page.id, locale },
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