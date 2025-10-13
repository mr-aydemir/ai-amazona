import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeRichHtml } from '@/lib/sanitize-html'

interface RouteParams {
  params: Promise<{ locale: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { locale } = await params

    let page = await prisma.distanceSalesPage.findFirst({ where: { slug: 'distance-sales' } })
    if (!page) {
      page = await prisma.distanceSalesPage.create({ data: { slug: 'distance-sales' } })
    }

    const translation = await prisma.distanceSalesPageTranslation.findUnique({
      where: { distanceSalesPageId_locale: { distanceSalesPageId: page.id, locale } },
    })

    const content = sanitizeRichHtml(translation?.contentHtml || '')
    return NextResponse.json({
      distanceSales: {
        id: page.id,
        locale,
        contentHtml: content || null,
      },
    })
  } catch (error) {
    console.error('[DISTANCE_SALES_PUBLIC_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch distance sales content' }, { status: 500 })
  }
}