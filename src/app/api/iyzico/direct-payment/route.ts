import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { iyzicoClient, createBasketItem, createBuyer, createAddress, formatPrice } from '@/lib/iyzico'
import { IyzicoDirectPaymentRequest } from '@/lib/iyzico'
import { z } from 'zod'

// Validation schema for direct payment request
const DirectPaymentSchema = z.object({
  cardNumber: z.string().min(16).max(19),
  expireMonth: z.string().length(2),
  expireYear: z.string().length(2),
  cvc: z.string().min(3).max(4),
  cardHolderName: z.string().min(2),
  installment: z.number().min(1).max(12).default(1),
  cartItems: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
    category: z.string().optional()
  })),
  shippingAddress: z.object({
    fullName: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string()
  }),
  billingAddress: z.object({
    fullName: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string()
  })
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()

    // First, get order data if orderId is provided
    let orderData = null
    if (body.orderId) {
      orderData = await prisma.order.findUnique({
        where: {
          id: body.orderId,
          userId: session.user.id,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            },
          },
        },
      })

      if (!orderData) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      // Auto-populate missing fields from order data
      if (!body.cartItems) {
        body.cartItems = orderData.items.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.price,
          quantity: item.quantity,
          category: item.product.category?.name || 'General'
        }))
      }

      if (!body.shippingAddress) {
        body.shippingAddress = {
          fullName: orderData.shippingFullName,
          street: orderData.shippingStreet,
          city: orderData.shippingCity,
          state: orderData.shippingState,
          postalCode: orderData.shippingPostalCode,
          country: orderData.shippingCountry
        }
      }

      if (!body.billingAddress) {
        body.billingAddress = {
          fullName: orderData.shippingFullName,
          street: orderData.shippingStreet,
          city: orderData.shippingCity,
          state: orderData.shippingState,
          postalCode: orderData.shippingPostalCode,
          country: orderData.shippingCountry
        }
      }
    }

    const validatedData = DirectPaymentSchema.parse(body)

    // Create basket items
    const basketItems = validatedData.cartItems.map(createBasketItem)

    // Calculate totals from basket items to ensure consistency
    const basketTotal = basketItems.reduce((sum, item) => sum + item.price, 0)
    const totalPrice = formatPrice(basketTotal)

    // Create buyer object
    const buyer = createBuyer(session.user, validatedData.shippingAddress)

    // Create addresses
    const shippingAddress = createAddress(validatedData.shippingAddress)
    const billingAddress = createAddress(validatedData.billingAddress)

    // Generate unique conversation and basket IDs
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const basketId = `basket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Prepare direct payment request
    const directPaymentRequest: IyzicoDirectPaymentRequest = {
      locale: 'tr',
      conversationId,
      price: formatPrice(totalPrice),
      paidPrice: formatPrice(totalPrice),
      currency: 'TRY',
      basketId,
      paymentGroup: 'PRODUCT',
      paymentChannel: 'WEB',
      installment: validatedData.installment,
      paymentCard: {
        cardNumber: validatedData.cardNumber.replace(/\s/g, ''), // Remove spaces
        expireMonth: validatedData.expireMonth,
        expireYear: validatedData.expireYear,
        cvc: validatedData.cvc,
        cardHolderName: validatedData.cardHolderName
      },
      buyer,
      shippingAddress,
      billingAddress,
      basketItems
    }

    // Make direct payment request to İyzico
    const result = await iyzicoClient.createDirectPayment(directPaymentRequest)

    // Check payment status
    if (result.status === 'success') {
      return NextResponse.json({
        success: true,
        paymentId: result.paymentId,
        conversationId: result.conversationId,
        status: result.status,
        message: 'Payment completed successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.errorMessage || 'Payment failed',
        errorCode: result.errorCode,
        status: result.status
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Direct payment error:', error)

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