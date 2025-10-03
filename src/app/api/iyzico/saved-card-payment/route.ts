import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { iyzicoClient, createBasketItem, createBuyer, createAddress, formatPrice, generateConversationId } from '@/lib/iyzico'
import { z } from 'zod'
import { sendEmail, renderEmailTemplate } from '@/lib/email'

// Validation schema for saved card payment
const SavedCardPaymentSchema = z.object({
  orderId: z.string().min(1),
  cardToken: z.string().min(1),
  installment: z.number().min(1).max(12).default(1),
  use3DS: z.boolean().default(false)
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = SavedCardPaymentSchema.parse(body)

    // Get the order
    const order = await prisma.order.findUnique({
      where: {
        id: validatedData.orderId,
        userId: session.user.id
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                translations: {
                  where: { locale: 'tr' }
                }
              }
            }
          }
        },
        user: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Get the saved card
    const savedCard = await prisma.savedCard.findFirst({
      where: {
        userId: session.user.id,
        cardToken: validatedData.cardToken
      }
    })

    if (!savedCard) {
      return NextResponse.json({ error: 'Saved card not found' }, { status: 404 })
    }

    // Calculate totals
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = subtotal * 0.18 // 18% VAT
    const shipping = order.shippingCost || 0
    const total = subtotal + tax + shipping

    // Generate conversation ID
    const conversationId = generateConversationId()
    const basketId = `basket_${order.id}_${Date.now()}`

    // Create basket items
    const basketItems = order.items.map(item => createBasketItem({
      id: item.productId,
      name: item.product.name,
      category: item.product.category?.name || 'General',
      price: item.price,
      quantity: item.quantity
    }))

    // Add tax and shipping as basket items
    if (tax > 0) {
      basketItems.push({
        id: 'tax',
        name: 'KDV (%18)',
        category1: 'Tax',
        itemType: 'VIRTUAL',
        price: formatPrice(tax)
      })
    }

    if (shipping > 0) {
      basketItems.push({
        id: 'shipping',
        name: 'Kargo Ücreti',
        category1: 'Shipping',
        itemType: 'VIRTUAL',
        price: formatPrice(shipping)
      })
    }

    // Create buyer info
    const buyer = createBuyer(order.user, {
      fullName: order.shippingFullName,
      street: order.shippingStreet,
      city: order.shippingCity,
      state: order.shippingState,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry
    })

    // Create addresses
    const shippingAddress = createAddress({
      fullName: order.shippingFullName,
      street: order.shippingStreet,
      city: order.shippingCity,
      state: order.shippingState,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry
    })

    const billingAddress = createAddress({
      fullName: order.shippingFullName,
      street: order.shippingStreet,
      city: order.shippingCity,
      state: order.shippingState,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry
    })

    if (validatedData.use3DS) {
      // 3DS Payment with saved card
      const threeDSPaymentRequest = {
        locale: 'tr',
        conversationId,
        price: formatPrice(total),
        paidPrice: formatPrice(total),
        currency: 'TRY',
        basketId,
        paymentGroup: 'PRODUCT',
        paymentChannel: 'WEB',
        installment: validatedData.installment,
        paymentCard: {
          cardUserKey: savedCard.cardUserKey,
          cardToken: savedCard.cardToken
        },
        buyer,
        shippingAddress,
        billingAddress,
        basketItems,
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/iyzico/3ds-callback`
      }

      const result = await iyzicoClient.payWithSavedCard3DS(threeDSPaymentRequest)

      if (result.status === 'success') {
        // Update order with conversation ID
        await prisma.order.update({
          where: { id: order.id },
          data: {
            iyzicoConversationId: conversationId
          }
        })

        return NextResponse.json({
          success: true,
          threeDSHtmlContent: result.threeDSHtmlContent,
          paymentId: result.paymentId,
          conversationId: result.conversationId,
          message: '3D Secure authentication required'
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.errorMessage || '3D Secure initialization failed',
          errorCode: result.errorCode
        }, { status: 400 })
      }
    } else {
      // Direct payment with saved card
      const directPaymentRequest = {
        locale: 'tr',
        conversationId,
        price: formatPrice(total),
        paidPrice: formatPrice(total),
        currency: 'TRY',
        basketId,
        paymentGroup: 'PRODUCT',
        paymentChannel: 'WEB',
        installment: validatedData.installment,
        paymentCard: {
          cardUserKey: savedCard.cardUserKey,
          cardToken: savedCard.cardToken
        },
        buyer,
        shippingAddress,
        billingAddress,
        basketItems
      }

      const result = await iyzicoClient.payWithSavedCard(directPaymentRequest)

      if (result.status === 'success') {
        // Update order status
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            iyzicoPaymentId: result.paymentId,
            iyzicoConversationId: conversationId,
            paidAt: new Date()
          }
        })

        // Send order received email
        try {
          const to = order.shippingEmail || order.user?.email || ''
          if (to) {
            const itemsHtml = (order.items || [])
              .map((it) => {
                const name = it.product?.translations?.[0]?.name || it.product?.name || 'Ürün'
                const qty = it.quantity
                const lineTotal = (it.price * it.quantity).toFixed(2)
                return `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0;">
                  <div style="color:#333;font-size:14px;">${name} × ${qty}</div>
                  <div style="color:#555;font-size:13px;">₺${lineTotal}</div>
                </div>`
              })
              .join('')

            const totalFormatted = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(total)
            const orderDateFormatted = order.createdAt ? new Date(order.createdAt).toLocaleString('tr-TR') : ''
            const orderUrl = `${process.env.NEXTAUTH_URL}/tr/order-confirmation/${order.id}`

            const html = await renderEmailTemplate('tr', 'order-received', {
              orderId: order.id,
              userName: order.user?.name || order.shippingFullName || '',
              total: totalFormatted,
              orderDate: orderDateFormatted,
              itemsHtml,
              orderUrl,
            })

            await sendEmail({ to, subject: 'Siparişiniz Alındı - Hivhestin', html })
          }
        } catch (emailError) {
          console.error('[EMAIL] Failed to send order received email:', emailError)
        }

        return NextResponse.json({
          success: true,
          paymentId: result.paymentId,
          conversationId: result.conversationId,
          message: 'Payment completed successfully'
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.errorMessage || 'Payment failed',
          errorCode: result.errorCode
        }, { status: 400 })
      }
    }

  } catch (error) {
    console.error('Saved card payment error:', error)

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