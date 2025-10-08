import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ locale: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { locale } = await params

    let page = await prisma.returnPolicyPage.findFirst({ where: { slug: 'return-policy' } })
    if (!page) {
      page = await prisma.returnPolicyPage.create({ data: { slug: 'return-policy' } })
    }

    const translation = await prisma.returnPolicyPageTranslation.findUnique({
      where: { returnPolicyPageId_locale: { returnPolicyPageId: page.id, locale } },
    })

    return NextResponse.json({
      returnPolicy: {
        id: page.id,
        locale,
        contentHtml: translation?.contentHtml || null,
      },
    })
  } catch (error) {
    console.error('[RETURN_POLICY_PUBLIC_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch return policy content' }, { status: 500 })
  }
}