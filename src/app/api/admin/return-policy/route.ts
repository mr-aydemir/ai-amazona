import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import * as z from 'zod'
import { sanitizeRichHtml } from '@/lib/sanitize-html'

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

    let page = await prisma.page.findUnique({ where: { slug: 'return-policy' } })
    if (!page) {
      page = await prisma.page.create({ data: { slug: 'return-policy' } })
    }

    const translations = await prisma.pageTranslation.findMany({
      where: { pageId: page.id },
      orderBy: { locale: 'asc' },
    })

    const normalized = translations.map((t) => ({
      locale: t.locale?.split('-')[0] || t.locale,
      contentHtml: t.contentHtml || '',
    }))

    return NextResponse.json({ page, translations: normalized })
  } catch (error) {
    console.error('[ADMIN_RETURN_POLICY_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch return policy page' }, { status: 500 })
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

    let page = await prisma.page.findUnique({ where: { slug: 'return-policy' } })
    if (!page) {
      page = await prisma.page.create({ data: { slug: 'return-policy' } })
    }

    for (const t of data.translations) {
      const safe = sanitizeRichHtml(t.contentHtml)
      await prisma.pageTranslation.upsert({
        where: { pageId_locale: { pageId: page.id, locale: t.locale } },
        update: { contentHtml: safe },
        create: { pageId: page.id, locale: t.locale, contentHtml: safe },
      })
    }

    const translations = await prisma.pageTranslation.findMany({
      where: { pageId: page.id },
      orderBy: { locale: 'asc' },
    })

    const normalized = translations.map((t) => ({
      locale: t.locale?.split('-')[0] || t.locale,
      contentHtml: t.contentHtml || '',
    }))

    return NextResponse.json({ page, translations: normalized })
  } catch (error) {
    console.error('[ADMIN_RETURN_POLICY_PUT] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to update return policy page' }, { status: 500 })
  }
}