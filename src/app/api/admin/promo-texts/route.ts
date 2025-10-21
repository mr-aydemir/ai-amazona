import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

function isAdmin(session: any) {
  return session?.user && session.user.role === 'ADMIN'
}

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
    const skip = (page - 1) * limit

    const where: any = {}
    if (search) {
      where.translations = {
        some: {
          text: { contains: search, mode: 'insensitive' },
        },
      }
    }

    const [promoTexts, total] = await Promise.all([
      prisma.promoText.findMany({
        where,
        include: locale
          ? { translations: { where: { locale } } }
          : { translations: true },
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      prisma.promoText.count({ where }),
    ])

    const items = promoTexts.map((p) => {
      const t = p.translations?.[0]
      return {
        id: p.id,
        sortOrder: p.sortOrder,
        active: p.active,
        text: t?.text,
      }
    })

    return NextResponse.json({
      promoTexts: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[ADMIN_PROMO_TEXTS_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch promo texts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sortOrder = 0, active = true, translations = [] } = body || {}

    const created = await prisma.promoText.create({
      data: {
        sortOrder,
        active,
        translations: translations?.length
          ? {
            create: translations.map((t: any) => ({
              locale: String(t.locale),
              text: String(t.text || ''),
            })),
          }
          : undefined,
      },
      include: { translations: true },
    })

    return NextResponse.json({ promoText: created })
  } catch (error) {
    console.error('[ADMIN_PROMO_TEXTS_POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create promo text' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, sortOrder, active, translations } = body || {}

    if (!id) {
      return NextResponse.json({ error: 'PromoText ID is required' }, { status: 400 })
    }

    const data: any = {}
    if (typeof sortOrder === 'number') data.sortOrder = sortOrder
    if (typeof active === 'boolean') data.active = active

    await prisma.promoText.update({
      where: { id },
      data,
    })

    if (Array.isArray(translations)) {
      for (const t of translations) {
        if (!t?.locale) continue
        const text = typeof t.text === 'string' ? t.text : undefined
        await prisma.promoTextTranslation.upsert({
          where: { promoTextId_locale: { promoTextId: id, locale: t.locale } },
          update: {
            ...(text !== undefined ? { text } : {}),
          },
          create: {
            promoTextId: id,
            locale: t.locale,
            text: text || '',
          },
        })
      }
    }

    const result = await prisma.promoText.findUnique({
      where: { id },
      include: { translations: true },
    })

    return NextResponse.json({ promoText: result })
  } catch (error) {
    console.error('[ADMIN_PROMO_TEXTS_PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update promo text' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body || {}
    if (!id) {
      return NextResponse.json({ error: 'PromoText ID is required' }, { status: 400 })
    }

    await prisma.promoText.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN_PROMO_TEXTS_DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete promo text' }, { status: 500 })
  }
}