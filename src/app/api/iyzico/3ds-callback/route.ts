import { NextRequest, NextResponse } from 'next/server'
import { iyzicoClient } from '@/lib/iyzico'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Iyzico callback
    const formData = await request.formData()
    const paymentId = formData.get('paymentId') as string
    const conversationId = formData.get('conversationId') as string
    const mdStatus = formData.get('mdStatus') as string

    console.log('3DS Callback received:', { paymentId, conversationId, mdStatus })

    // Check if 3DS authentication was successful
    if (mdStatus !== '1') {
      console.error('3DS authentication failed:', mdStatus)
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      return NextResponse.redirect(
        new URL('/checkout/payment-error?error=3ds_failed', baseUrl)
      )
    }

    // Complete the 3DS payment with Iyzico
    const result = await iyzicoClient.retrieve3DSPayment({
      paymentId,
      conversationId
    })

    if (result.status !== 'success') {
      console.error('3DS payment completion failed:', result)
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      return NextResponse.redirect(
        new URL('/checkout/payment-error?error=payment_failed', baseUrl)
      )
    }

    // Extract userId from conversationId (format: conv_userId_timestamp_random)
    const conversationParts = conversationId.split('_')
    if (conversationParts.length < 2 || conversationParts[0] !== 'conv') {
      throw new Error('Invalid conversation ID format')
    }

    const userId = conversationParts[1]
    console.log('Extracted userId from conversationId:', userId)

    // Find the existing order with this conversationId
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId,
        iyzicoConversationId: conversationId,
        status: 'PENDING'
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
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
          status: 'PAID',
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

      return updatedOrder
    })

    // Redirect to success page
    const paymentIdParam = result.paymentId || paymentId || 'unknown'
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
    return NextResponse.redirect(
      new URL(`/checkout/payment-success?orderId=${order.id}&paymentId=${paymentIdParam}`, baseUrl)
    )

  } catch (error) {
    console.error('3DS callback error:', error)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
    return NextResponse.redirect(
      new URL('/checkout/payment-error?error=callback_failed', baseUrl)
    )
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
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
  const errorUrl = `/checkout/payment-error?error=invalid_callback_method`
  return NextResponse.redirect(new URL(errorUrl, baseUrl))
}