import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import * as z from 'zod'

function isAdmin(session: any) {
  return session?.user && session.user.role === 'ADMIN'
}

const updateSchema = z.object({
  translations: z
    .array(
      z.object({
        locale: z.string().min(2),
        contentHtml: z.string().optional().default(''),
      })
    )
    .min(1),
})

export async function GET() {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let page = await prisma.distanceSalesPage.findFirst({ where: { slug: 'distance-sales' } })
    if (!page) {
      page = await prisma.distanceSalesPage.create({ data: { slug: 'distance-sales' } })
    }

    const translations = await prisma.distanceSalesPageTranslation.findMany({
      where: { distanceSalesPageId: page.id },
      orderBy: { locale: 'asc' },
    })

    const normalized = translations.map((t) => ({
      locale: t.locale?.split('-')[0] || t.locale,
      contentHtml: t.contentHtml || '',
    }))

    return NextResponse.json({ page, translations: normalized })
  } catch (error) {
    console.error('[ADMIN_DISTANCE_SALES_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch distance sales page' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = updateSchema.parse(body)

    let page = await prisma.distanceSalesPage.findFirst({ where: { slug: 'distance-sales' } })
    if (!page) {
      page = await prisma.distanceSalesPage.create({ data: { slug: 'distance-sales' } })
    }

    for (const t of data.translations) {
      await prisma.distanceSalesPageTranslation.upsert({
        where: { distanceSalesPageId_locale: { distanceSalesPageId: page.id, locale: t.locale } },
        update: { contentHtml: t.contentHtml },
        create: { distanceSalesPageId: page.id, locale: t.locale, contentHtml: t.contentHtml },
      })
    }

    const translations = await prisma.distanceSalesPageTranslation.findMany({
      where: { distanceSalesPageId: page.id },
      orderBy: { locale: 'asc' },
    })

    const normalized = translations.map((t) => ({
      locale: t.locale?.split('-')[0] || t.locale,
      contentHtml: t.contentHtml || '',
    }))

    return NextResponse.json({ page, translations: normalized })
  } catch (error) {
    console.error('[ADMIN_DISTANCE_SALES_PUT] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to update distance sales page' }, { status: 500 })
  }
}