import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { iyzicoClient } from '@/lib/iyzico'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Iyzico callback
    const formData = await request.formData()
    //const baseUrl
    const paymentId = formData.get('paymentId') as string
    const conversationId = formData.get('conversationId') as string
    const mdStatus = formData.get('mdStatus') as string

    console.log('3DS Callback received:', { paymentId, conversationId, mdStatus })

    // Check if 3DS authentication was successful
    if (mdStatus !== '1') {
      console.error('3DS authentication failed:', mdStatus)
      redirect('/checkout/payment-error?error=3ds_failed')
    }

    // Complete the 3DS payment with Iyzico
    const result = await iyzicoClient.retrieve3DSPayment({
      paymentId,
      conversationId
    })

    if (result.status !== 'success') {
      console.error('3DS payment completion failed:', result)
      redirect('/checkout/payment-error?error=payment_failed')
    }

    // Extract userId from conversationId (format: order_timestamp_random)
    const conversationParts = conversationId.split('_')
    if (conversationParts.length < 3 || conversationParts[0] !== 'order') {
      throw new Error('Invalid conversation ID format')
    }

    // For order_ format, we need to find the order by conversationId directly
    console.log('Looking for order with conversationId:', conversationId)

    // Find the existing order with this conversationId
    const existingOrder = await prisma.order.findFirst({
      where: {
        iyzicoConversationId: conversationId,
        status: 'PENDING'
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    })

    if (!existingOrder) {
      console.error('No pending order found for conversationId:', conversationId)
      throw new Error('Order not found')
    }

    console.log('Existing order found:', {
      id: existingOrder.id,
      userId: existingOrder.userId,
      status: existingOrder.status,
      total: existingOrder.total,
      itemsCount: existingOrder.items.length
    })

    // Update the existing order to PAID status
    const order = await prisma.$transaction(async (tx) => {
      // Update order status and payment info
      const updatedOrder = await tx.order.update({
        where: { id: existingOrder.id },
        data: {
          status: OrderStatus.PAID,
          iyzicoPaymentId: result.paymentId,
          paidAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      // Save card if requested
      if (existingOrder.saveCardRequested && existingOrder.cardInfo) {
        console.log('🔄 Card save requested in callback:', {
          saveCardRequested: existingOrder.saveCardRequested,
          cardInfo: existingOrder.cardInfo,
          userId: existingOrder.userId
        })
        
        try {
          const cardInfo = JSON.parse(existingOrder.cardInfo)
          console.log('📋 Parsed card info:', cardInfo)
          
          // Create card using Iyzico API (this creates both user key and saves the card)
          const createCardRequest = {
            locale: 'tr',
            conversationId: `card_${existingOrder.userId}_${Date.now()}`,
            externalId: existingOrder.userId,
            email: existingOrder.user?.email || 'user@example.com',
            card: {
              cardNumber: cardInfo.cardNumber,
              expireMonth: cardInfo.expireMonth,
              expireYear: cardInfo.expireYear,
              cardHolderName: cardInfo.cardHolderName,
              cardAlias: `${cardInfo.cardHolderName} - **** ${cardInfo.cardNumber}`
            }
          }

          console.log('💳 Creating card with request:', createCardRequest)
          const createCardResult = await iyzicoClient.createCard(createCardRequest)
          console.log('💳 Create card result:', createCardResult)
          
          if (createCardResult.status === 'success') {
            // Save to database
            const savedCard = await tx.savedCard.create({
              data: {
                userId: existingOrder.userId,
                cardToken: createCardResult.cardToken,
                cardUserKey: createCardResult.cardUserKey,
                cardAlias: createCardResult.cardAlias,
                binNumber: createCardResult.binNumber || cardInfo.cardNumber.substring(0, 6),
                lastFourDigits: createCardResult.lastFourDigits,
                cardFamily: createCardResult.cardFamily || 'Unknown',
                cardType: createCardResult.cardType || 'Unknown',
                cardAssociation: createCardResult.cardAssociation || 'Unknown'
              }
            })
            console.log('✅ Card saved to database:', savedCard)
          } else {
            console.error('❌ Failed to create card:', createCardResult)
          }
        } catch (error) {
          console.error('❌ Card save error in callback:', error)
          // Don't fail the payment if card save fails
        }
      } else {
        console.log('ℹ️ Card save not requested or no card info:', {
          saveCardRequested: existingOrder.saveCardRequested,
          hasCardInfo: !!existingOrder.cardInfo
        })
      }

      return updatedOrder
    })

    // Redirect to success page using Next.js redirect
    const paymentIdValue = result.paymentId || paymentId || 'unknown'
    redirect(`/checkout/payment-success?orderId=${order.id}&paymentId=${paymentIdValue}`)

  } catch (error) {
    // Check if this is a Next.js redirect error (which is expected)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      // Re-throw redirect errors so they work properly
      throw error
    }
    
    console.error('3DS callback error:', error)
    redirect('/checkout/payment-error?error=callback_failed')
  }
}

// Handle GET requests (in case İyzico sends GET instead of POST)
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const paymentId = url.searchParams.get('paymentId')
  const conversationId = url.searchParams.get('conversationId')
  const mdStatus = url.searchParams.get('mdStatus')

  console.log('3DS Callback GET received:', { paymentId, conversationId, mdStatus })

  // Redirect to error page for GET requests
  redirect('/checkout/payment-error?error=invalid_callback_method')
}