import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ productId: string }>
}

// DELETE /api/favorites/:productId
// Removes a product from user's favorites
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await params
    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const favorite = await prisma.favorite.findFirst({
      where: { userId: session.user.id, productId },
      select: { id: true },
    })

    if (!favorite) {
      return NextResponse.json({ success: true, message: 'Not in favorites' })
    }

    await prisma.favorite.delete({ where: { id: favorite.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Favorites DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}