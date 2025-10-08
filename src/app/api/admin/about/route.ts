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

    let page = await prisma.aboutPage.findFirst({ where: { slug: 'about' } })
    if (!page) {
      page = await prisma.aboutPage.create({ data: { slug: 'about' } })
    }

    const translations = await prisma.aboutPageTranslation.findMany({
      where: { aboutPageId: page.id },
      orderBy: { locale: 'asc' },
    })

    // Normalize locales like "tr-TR" -> "tr" to match frontend tabs
    const normalized = translations.map((t) => ({
      locale: t.locale?.split('-')[0] || t.locale,
      contentHtml: t.contentHtml || '',
    }))

    return NextResponse.json({ page, translations: normalized })
  } catch (error) {
    console.error('[ADMIN_ABOUT_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch about page' }, { status: 500 })
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

    let page = await prisma.aboutPage.findFirst({ where: { slug: 'about' } })
    if (!page) {
      page = await prisma.aboutPage.create({ data: { slug: 'about' } })
    }

    for (const t of data.translations) {
      await prisma.aboutPageTranslation.upsert({
        where: { aboutPageId_locale: { aboutPageId: page.id, locale: t.locale } },
        update: { contentHtml: t.contentHtml },
        create: { aboutPageId: page.id, locale: t.locale, contentHtml: t.contentHtml },
      })
    }

    const translations = await prisma.aboutPageTranslation.findMany({
      where: { aboutPageId: page.id },
      orderBy: { locale: 'asc' },
    })

    return NextResponse.json({ page, translations })
  } catch (error) {
    console.error('[ADMIN_ABOUT_PUT] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to update about page' }, { status: 500 })
  }
}