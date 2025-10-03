import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { iyzicoClient, generateConversationId } from '@/lib/iyzico'

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

    // First delete from İyzico
    const conversationId = generateConversationId()
    const iyzicoResult = await iyzicoClient.deleteSavedCard({
      locale: 'tr',
      conversationId,
      cardUserKey: savedCard.cardUserKey,
      cardToken: savedCard.cardToken,
    })

    if (iyzicoResult?.status !== 'success') {
      return NextResponse.json(
        {
          error: iyzicoResult?.errorMessage || 'İyzico card delete failed',
          errorCode: iyzicoResult?.errorCode,
        },
        { status: 400 }
      )
    }

    // If İyzico delete succeeded, remove from database
    await prisma.savedCard.delete({ where: { id } })

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