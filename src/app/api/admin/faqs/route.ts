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

const createSchema = z.object({
  translations: z.array(translationSchema).min(1),
  sortOrder: z.number().optional().default(0),
  active: z.boolean().optional().default(true),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const locale = searchParams.get('locale') || undefined
    const activeParam = searchParams.get('active')
    const skip = (page - 1) * limit

    const where: any = {}
    if (activeParam === 'true') where.active = true
    if (activeParam === 'false') where.active = false

    if (search) {
      where.translations = {
        some: {
          OR: [
            { question: { contains: search, mode: 'insensitive' } },
            { answer: { contains: search, mode: 'insensitive' } },
          ],
        },
      }
    }

    const [faqs, total] = await Promise.all([
      prisma.fAQ.findMany({
        where,
        include: locale
          ? { translations: { where: { locale } } }
          : { translations: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.fAQ.count({ where }),
    ])

    const items = faqs.map((f) => {
      const t = f.translations?.[0]
      return {
        id: f.id,
        sortOrder: f.sortOrder,
        active: f.active,
        question: t?.question || '',
        answer: t?.answer || '',
      }
    })

    return NextResponse.json({ items, total, page, limit })
  } catch (error) {
    console.error('[ADMIN_FAQS_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch FAQs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createSchema.parse(body)

    const faq = await prisma.fAQ.create({
      data: {
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
        translations: {
          create: data.translations.map((t) => ({
            locale: t.locale,
            question: t.question,
            answer: t.answer,
          })),
        },
      },
      include: { translations: true },
    })

    return NextResponse.json({ faq })
  } catch (error) {
    console.error('[ADMIN_FAQS_POST] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to create FAQ' }, { status: 500 })
  }
}