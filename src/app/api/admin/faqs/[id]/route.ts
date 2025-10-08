import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import * as z from 'zod'

function isAdmin(session: any) {
  return session?.user && session.user.role === 'ADMIN'
}

const translationSchema = z.object({
  locale: z.string().min(2),
  question: z.string().min(1),
  answer: z.string().min(1),
})

const updateSchema = z.object({
  sortOrder: z.number().optional(),
  active: z.boolean().optional(),
  translations: z.array(translationSchema).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = params.id
    const faq = await prisma.fAQ.findUnique({
      where: { id },
      include: { translations: true },
    })
    if (!faq) return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })

    return NextResponse.json({ faq })
  } catch (error) {
    console.error('[ADMIN_FAQS_GET_BY_ID] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch FAQ' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = params.id
    const body = await request.json()
    const data = updateSchema.parse(body)

    const existing = await prisma.fAQ.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 })
    }

    // Update parent fields if provided
    if (data.sortOrder !== undefined || data.active !== undefined) {
      await prisma.fAQ.update({
        where: { id },
        data: {
          sortOrder: data.sortOrder ?? existing.sortOrder,
          active: data.active ?? existing.active,
        },
      })
    }

    // Upsert translations if provided
    if (Array.isArray(data.translations)) {
      for (const t of data.translations) {
        await prisma.fAQTranslation.upsert({
          where: { faqId_locale: { faqId: id, locale: t.locale } },
          update: { question: t.question, answer: t.answer },
          create: { faqId: id, locale: t.locale, question: t.question, answer: t.answer },
        })
      }
    }

    const faq = await prisma.fAQ.findUnique({
      where: { id },
      include: { translations: true },
    })

    return NextResponse.json({ faq })
  } catch (error) {
    console.error('[ADMIN_FAQS_PUT] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to update FAQ' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = params.id

    await prisma.fAQ.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN_FAQS_DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete FAQ' }, { status: 500 })
  }
}