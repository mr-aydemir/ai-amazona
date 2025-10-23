import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { sendStaffQuestionNotification } from '@/lib/question-email'

// Create a product question (public or private), with optional anonymous display
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const { productId, content, isPublic = true, hideName = false, guestName, guestEmail } = body || {}

    if (!productId || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Eksik alanlar' }, { status: 400 })
    }

    // Ensure product exists and ACTIVE
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product || product.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    const data: any = {
      productId,
      content: content.trim(),
      isPublic: Boolean(isPublic),
      hideName: Boolean(hideName),
    }

    if (session?.user?.id) {
      data.userId = session.user.id
    } else {
      // For guests, require name and email if public or private
      if (!guestName?.trim() || !guestEmail?.trim()) {
        return NextResponse.json({ error: 'İsim ve e-posta gerekli' }, { status: 400 })
      }
      data.guestName = guestName.trim()
      data.guestEmail = guestEmail.trim()
    }

    const question = await prisma.productQuestion.create({ data })

    // Notify admin/staff users asynchronously (best-effort)
    sendStaffQuestionNotification(question.id).catch(() => {})

    return NextResponse.json({ ok: true, question })
  } catch (error) {
    console.error('Question POST error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// Get public questions for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const includePrivate = searchParams.get('includePrivate') === 'true'

    if (!productId) {
      return NextResponse.json({ error: 'productId gereklidir' }, { status: 400 })
    }

    const where: any = { productId }
    if (!includePrivate) where.isPublic = true

    const questions = await prisma.productQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        isPublic: true,
        hideName: true,
        createdAt: true,
        answer: true,
        answeredAt: true,
        user: { select: { name: true, image: true, email: true } },
        guestName: true,
        guestEmail: true,
      },
    })

    return NextResponse.json({ ok: true, items: questions })
  } catch (error) {
    console.error('Question GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// Answer a question (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const { id, answer } = body || {}

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    // Check admin role
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!me || (me.role !== 'ADMIN' && me.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    if (!id || typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json({ error: 'Eksik alanlar' }, { status: 400 })
    }

    const existing = await prisma.productQuestion.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Soru bulunamadı' }, { status: 404 })
    }

    const updated = await prisma.productQuestion.update({
      where: { id },
      data: {
        answer: answer.trim(),
        answeredById: session.user.id,
        answeredAt: new Date(),
      }
    })

    return NextResponse.json({ ok: true, question: updated })
  } catch (error) {
    console.error('Question PUT error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}