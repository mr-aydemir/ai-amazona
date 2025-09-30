import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE - Delete a saved card
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Find the card and verify ownership
    const savedCard = await prisma.savedCard.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!savedCard) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      )
    }

    // Delete the card
    await prisma.savedCard.delete({
      where: {
        id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Card deleted successfully'
    })

  } catch (error) {
    console.error('Delete saved card error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}