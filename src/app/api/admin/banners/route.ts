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

    const where: any = { active: undefined }
    if (search) {
      // Search by translation title or description
      where.translations = {
        some: {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      }
    }

    const [banners, total] = await Promise.all([
      prisma.banner.findMany({
        where,
        include: locale
          ? { translations: { where: { locale } } }
          : { translations: true },
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      prisma.banner.count({ where }),
    ])

    const items = banners.map((b) => {
      const t = b.translations?.[0]
      return {
        id: b.id,
        image: b.image,
        linkUrl: b.linkUrl,
        sortOrder: b.sortOrder,
        active: b.active,
        title: t?.title,
        description: t?.description,
      }
    })

    return NextResponse.json({
      banners: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[ADMIN_BANNERS_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { image, linkUrl, sortOrder = 0, active = true, translations = [] } = body || {}

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Image path is required' }, { status: 400 })
    }

    const created = await prisma.banner.create({
      data: {
        image,
        linkUrl,
        sortOrder,
        active,
        translations: translations?.length
          ? {
              create: translations.map((t: any) => ({
                locale: String(t.locale),
                title: String(t.title || ''),
                description: t.description ? String(t.description) : null,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    })

    return NextResponse.json({ banner: created })
  } catch (error) {
    console.error('[ADMIN_BANNERS_POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, image, linkUrl, sortOrder, active, translations } = body || {}

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 })
    }

    const data: any = {}
    if (typeof image === 'string') data.image = image
    if (typeof linkUrl === 'string') data.linkUrl = linkUrl
    if (typeof sortOrder === 'number') data.sortOrder = sortOrder
    if (typeof active === 'boolean') data.active = active

    const updated = await prisma.banner.update({
      where: { id },
      data,
      include: { translations: true },
    })

    // Handle translations upsert separately
    if (Array.isArray(translations)) {
      for (const t of translations) {
        if (!t?.locale) continue
        const title = typeof t.title === 'string' ? t.title : undefined
        const description = typeof t.description === 'string' ? t.description : undefined
        // Upsert translation
        await prisma.bannerTranslation.upsert({
          where: { bannerId_locale: { bannerId: id, locale: t.locale } },
          update: {
            ...(title !== undefined ? { title } : {}),
            ...(description !== undefined ? { description } : {}),
          },
          create: {
            bannerId: id,
            locale: t.locale,
            title: title || '',
            description: description || null,
          },
        })
      }
    }

    const result = await prisma.banner.findUnique({
      where: { id },
      include: { translations: true },
    })

    return NextResponse.json({ banner: result })
  } catch (error) {
    console.error('[ADMIN_BANNERS_PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 })
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
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 })
    }

    await prisma.banner.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN_BANNERS_DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 })
  }
}