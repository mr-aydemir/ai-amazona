import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for saving a card
const SaveCardSchema = z.object({
  cardUserKey: z.string().min(1),
  cardToken: z.string().min(1),
  cardAlias: z.string().min(1).max(50),
  binNumber: z.string().length(6),
  lastFourDigits: z.string().length(4),
  cardType: z.string().min(1),
  cardAssociation: z.string().min(1),
  cardFamily: z.string().min(1),
  cardBankCode: z.string().optional(),
  cardBankName: z.string().optional()
})

// GET - List user's saved cards
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const savedCards = await prisma.savedCard.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      cards: savedCards
    })

  } catch (error) {
    console.error('Get saved cards error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save a new card
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = SaveCardSchema.parse(body)

    // Check if card already exists for this user
    const existingCard = await prisma.savedCard.findFirst({
      where: {
        userId: session.user.id,
        cardToken: validatedData.cardToken
      }
    })

    if (existingCard) {
      return NextResponse.json(
        { error: 'Card already saved' },
        { status: 400 }
      )
    }

    // Save the card
    const savedCard = await prisma.savedCard.create({
      data: {
        userId: session.user.id,
        cardUserKey: validatedData.cardUserKey,
        cardToken: validatedData.cardToken,
        cardAlias: validatedData.cardAlias,
        binNumber: validatedData.binNumber,
        lastFourDigits: validatedData.lastFourDigits,
        cardType: validatedData.cardType,
        cardAssociation: validatedData.cardAssociation,
        cardFamily: validatedData.cardFamily,
        cardBankCode: validatedData.cardBankCode,
        cardBankName: validatedData.cardBankName
      }
    })

    return NextResponse.json({
      success: true,
      card: savedCard,
      message: 'Card saved successfully'
    })

  } catch (error) {
    console.error('Save card error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}