import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { iyzicoClient, generateConversationId } from '@/lib/iyzico'
import type { IyzicoCardCreateRequest, IyzicoCardSaveRequest } from '@/lib/iyzico'
import { z } from 'zod'

// Validation schema for card saving
const SaveCardSchema = z.object({
  cardNumber: z.string().min(16).max(19),
  expireMonth: z.string().length(2),
  expireYear: z.string().length(2),
  cvc: z.string().min(3).max(4),
  cardHolderName: z.string().min(2),
  cardAlias: z.string().min(1).max(50).optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = SaveCardSchema.parse(body)

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || !user.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate conversation ID
    const conversationId = generateConversationId()

    // First, try to create a new card and user with İyzico
    const cardCreateRequest: IyzicoCardCreateRequest = {
      locale: 'tr',
      conversationId,
      externalId: session.user.id,
      email: user.email,
      card: {
        cardAlias: validatedData.cardAlias || `**** ${validatedData.cardNumber.slice(-4)}`,
        cardNumber: validatedData.cardNumber.replace(/\s/g, ''), // Remove spaces
        expireYear: validatedData.expireYear,
        expireMonth: validatedData.expireMonth,
        cardHolderName: validatedData.cardHolderName
      }
    }

    // Try to create card first (this will create user and card if user doesn't exist)
    const createResult = await iyzicoClient.createCard(cardCreateRequest)

    if (createResult.status === 'success') {
      // Save card info to database
      const savedCard = await prisma.savedCard.create({
        data: {
          userId: session.user.id,
          cardUserKey: createResult.cardUserKey,
          cardToken: createResult.cardToken,
          cardAlias: createResult.cardAlias,
          binNumber: createResult.binNumber,
          lastFourDigits: createResult.lastFourDigits,
          cardType: createResult.cardType,
          cardAssociation: createResult.cardAssociation,
          cardFamily: createResult.cardFamily,
          cardBankCode: createResult.cardBankCode?.toString(),
          cardBankName: createResult.cardBankName
        }
      })

      return NextResponse.json({
        success: true,
        card: savedCard,
        message: 'Card created and saved successfully'
      })
    } else if (createResult.errorCode === '3005') {
      // cardUserKey already exists, try to save card to existing user
      // Generate card user key (unique identifier for user's cards)
      const cardUserKey = `user_${session.user.id}_${Date.now()}`

      // Prepare card save request for existing user
      const cardSaveRequest: IyzicoCardSaveRequest = {
        locale: 'tr',
        conversationId: generateConversationId(),
        email: user.email,
        cardUserKey,
        card: {
          cardHolderName: validatedData.cardHolderName,
          cardNumber: validatedData.cardNumber.replace(/\s/g, ''), // Remove spaces
          expireMonth: validatedData.expireMonth,
          expireYear: validatedData.expireYear,
          cvc: validatedData.cvc
        }
      }

      // Save card with İyzico
      const saveResult = await iyzicoClient.saveCard(cardSaveRequest)

      if (saveResult.status === 'success') {
        // Save card info to database
        const savedCard = await prisma.savedCard.create({
          data: {
            userId: session.user.id,
            cardUserKey: saveResult.cardUserKey,
            cardToken: saveResult.cardToken,
            cardAlias: validatedData.cardAlias || saveResult.cardAlias || `**** ${saveResult.lastFourDigits}`,
            binNumber: saveResult.binNumber,
            lastFourDigits: saveResult.lastFourDigits,
            cardType: saveResult.cardType,
            cardAssociation: saveResult.cardAssociation,
            cardFamily: saveResult.cardFamily,
            cardBankCode: saveResult.cardBankCode,
            cardBankName: saveResult.cardBankName
          }
        })

        return NextResponse.json({
          success: true,
          card: savedCard,
          message: 'Card saved successfully'
        })
      } else {
        return NextResponse.json({
          success: false,
          error: saveResult.errorMessage || 'Card save failed',
          errorCode: saveResult.errorCode
        }, { status: 400 })
      }
    } else {
      return NextResponse.json({
        success: false,
        error: createResult.errorMessage || 'Card creation failed',
        errorCode: createResult.errorCode
      }, { status: 400 })
    }

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