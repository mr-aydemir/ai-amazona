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

    let page = await prisma.termsPage.findFirst({ where: { slug: 'terms' } })
    if (!page) {
      page = await prisma.termsPage.create({ data: { slug: 'terms' } })
    }

    const translations = await prisma.termsPageTranslation.findMany({
      where: { termsPageId: page.id },
      orderBy: { locale: 'asc' },
    })

    const normalized = translations.map((t) => ({
      locale: t.locale?.split('-')[0] || t.locale,
      contentHtml: t.contentHtml || '',
    }))

    return NextResponse.json({ page, translations: normalized })
  } catch (error) {
    console.error('[ADMIN_TERMS_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch terms page' }, { status: 500 })
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

    let page = await prisma.termsPage.findFirst({ where: { slug: 'terms' } })
    if (!page) {
      page = await prisma.termsPage.create({ data: { slug: 'terms' } })
    }

    for (const t of data.translations) {
      await prisma.termsPageTranslation.upsert({
        where: { termsPageId_locale: { termsPageId: page.id, locale: t.locale } },
        update: { contentHtml: t.contentHtml },
        create: { termsPageId: page.id, locale: t.locale, contentHtml: t.contentHtml },
      })
    }

    const translations = await prisma.termsPageTranslation.findMany({
      where: { termsPageId: page.id },
      orderBy: { locale: 'asc' },
    })

    const normalized = translations.map((t) => ({
      locale: t.locale?.split('-')[0] || t.locale,
      contentHtml: t.contentHtml || '',
    }))

    return NextResponse.json({ page, translations: normalized })
  } catch (error) {
    console.error('[ADMIN_TERMS_PUT] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to update terms page' }, { status: 500 })
  }
}