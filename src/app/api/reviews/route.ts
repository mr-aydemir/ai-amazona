import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const { productId, rating, comment, guestName, guestEmail } = body || {}

    if (!productId || typeof rating !== 'number') {
      return NextResponse.json({ error: 'Eksik alanlar' }, { status: 400 })
    }

    const cleanRating = Math.max(1, Math.min(5, Math.floor(rating)))

    // Ensure product exists and is ACTIVE
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })
    if (!product || product.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    // Only authenticated purchasers can review
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yalnızca ürünü satın alanlar yorum yapabilir' }, { status: 403 })
    }

    // Verify purchase: user must have an order containing this product that is paid/delivered/shipped
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          is: {
            userId: session.user.id,
            status: { in: ['PAID', 'DELIVERED', 'SHIPPED'] },
          }
        }
      }
    })

    if (!hasPurchased) {
      return NextResponse.json({ error: 'Yalnızca ürünü satın alanlar yorum yapabilir' }, { status: 403 })
    }

    // Enforce single review per user per product
    const existing = await prisma.review.findFirst({
      where: { productId, userId: session.user.id }
    })

    if (existing) {
      return NextResponse.json({ error: 'Zaten bir yorumunuz var', review: existing }, { status: 409 })
    }

    const data: any = {
      productId,
      rating: cleanRating,
      comment: typeof comment === 'string' ? comment.trim() : null,
      userId: session.user.id,
    }

    const review = await prisma.review.create({ data })
    return NextResponse.json({ ok: true, review })
  } catch (error) {
    console.error('Review POST error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// Check if current user can review a specific product
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'productId gereklidir' }, { status: 400 })
    }

    if (!session?.user?.id) {
      return NextResponse.json({ canReview: false })
    }

    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          is: {
            userId: session.user.id,
            status: { in: ['PAID', 'DELIVERED', 'SHIPPED'] },
          }
        }
      }
    })

    // Return existing review if present
    const existing = await prisma.review.findFirst({
      where: { productId, userId: session.user.id },
      include: { user: true }
    })

    const canReview = Boolean(hasPurchased) && !existing
    return NextResponse.json({ canReview, review: existing || null })
  } catch (error) {
    console.error('Review GET can-review error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// Update existing review for current user and product
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()
    const { productId, rating, comment } = body || {}

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    if (!productId || typeof rating !== 'number') {
      return NextResponse.json({ error: 'Eksik alanlar' }, { status: 400 })
    }

    const cleanRating = Math.max(1, Math.min(5, Math.floor(rating)))

    const existing = await prisma.review.findFirst({
      where: { productId, userId: session.user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Yorum bulunamadı' }, { status: 404 })
    }

    const updated = await prisma.review.update({
      where: { id: existing.id },
      data: {
        rating: cleanRating,
        comment: typeof comment === 'string' ? comment.trim() : null,
      }
    })

    return NextResponse.json({ ok: true, review: updated })
  } catch (error) {
    console.error('Review PUT error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}