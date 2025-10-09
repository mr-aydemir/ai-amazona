import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/favorites
// Returns user's favorite products
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: session.user.id },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const items = favorites.map((f) => ({
      id: f.id,
      productId: f.productId,
      createdAt: f.createdAt,
      product: f.product,
    }))

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('Favorites GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/favorites
// Body: { productId: string }
// Adds a product to user's favorites
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await request.json()
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    // Ensure product exists
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if already favorited
    const existing = await prisma.favorite.findFirst({
      where: { userId: session.user.id, productId },
    })
    if (existing) {
      return NextResponse.json({ success: true, message: 'Already in favorites' })
    }

    const created = await prisma.favorite.create({
      data: {
        userId: session.user.id,
        productId,
      },
    })

    return NextResponse.json({ success: true, id: created.id })
  } catch (error) {
    console.error('Favorites POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}