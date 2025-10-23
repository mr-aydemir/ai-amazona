import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

function isStaff(session: any) {
  return session?.user && (session.user.role === 'ADMIN' || session.user.role === 'STAFF')
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!isStaff(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const productId = searchParams.get('productId') || undefined
    const isPublic = searchParams.get('isPublic')
    const answered = searchParams.get('answered')
    const locale = searchParams.get('locale') || undefined

    const where: any = {}
    if (productId) where.productId = productId
    if (isPublic === 'true') where.isPublic = true
    if (isPublic === 'false') where.isPublic = false
    if (answered === 'true') where.AND = [{ answer: { not: null } }]
    if (answered === 'false') where.AND = [{ answer: null }]
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { guestName: { contains: search, mode: 'insensitive' } },
        { guestEmail: { contains: search, mode: 'insensitive' } },
        { user: { is: { name: { contains: search, mode: 'insensitive' } } } },
      ]
    }

    const total = await prisma.productQuestion.count({ where })

    const questions = await prisma.productQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: locale
          ? { include: { translations: { where: { locale }, take: 1 } } }
          : true,
        user: { select: { name: true, email: true } },
        answeredBy: { select: { name: true, email: true } },
      },
    })

    const items = questions.map((q) => ({
      id: q.id,
      content: q.content,
      isPublic: q.isPublic,
      hideName: q.hideName,
      createdAt: q.createdAt,
      answer: q.answer,
      answeredAt: q.answeredAt,
      productName: (() => {
        if (!q.product) return ''
        const t = (q.product as any).translations?.[0]
        return t?.name ?? (q.product as any).name ?? ''
      })(),
      askerName: q.hideName
        ? 'Anonim'
        : (q.user?.name || q.guestName || q.user?.email || q.guestEmail || 'Anonim'),
      askerEmail: q.user?.email || q.guestEmail || '',
      answeredByName: q.answeredBy?.name || q.answeredBy?.email || '',
    }))

    return NextResponse.json({ items, total, page, limit })
  } catch (error) {
    console.error('[ADMIN_QUESTIONS_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}