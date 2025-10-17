import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeRichHtml } from '@/lib/sanitize-html'

interface RouteParams {
  params: Promise<{ locale: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { locale } = await params

    let page = await prisma.page.findUnique({ where: { slug: 'shipping-delivery' } })
    if (!page) {
      page = await prisma.page.create({ data: { slug: 'shipping-delivery' } })
    }

    const translation = await prisma.pageTranslation.findUnique({
      where: { pageId_locale: { pageId: page.id, locale } },
    })

    const content = sanitizeRichHtml(translation?.contentHtml || '')
    return NextResponse.json({
      shippingDelivery: {
        id: page.id,
        locale,
        contentHtml: content || null,
      },
    })
  } catch (error) {
    console.error('[SHIPPING_DELIVERY_PUBLIC_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch shipping & delivery content' }, { status: 500 })
  }
}