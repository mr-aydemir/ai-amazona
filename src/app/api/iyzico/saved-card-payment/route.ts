import { NextRequest, NextResponse } from 'next/server'
// cookies kullanılmıyor; para birimi client’tan body ile alınacak
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { iyzicoClient, createBasketItem, createBuyer, createAddress, formatPrice, generateConversationId } from '@/lib/iyzico'
import { z } from 'zod'
import { sendOrderReceivedEmail } from '@/lib/order-email'
import { getCurrencyData, convertServer } from '@/lib/server-currency'

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

    // Currency selection: body.currency varsa onu kullan, yoksa baseCurrency
    const { baseCurrency, rates } = await getCurrencyData()
    const providedCurrency = typeof body.currency === 'string' ? body.currency : undefined
    const rateCodes = new Set(rates.map(r => r.currency))
    const displayCurrency = (providedCurrency && rateCodes.has(providedCurrency)) ? providedCurrency : baseCurrency

    // Calculate totals (base currency)
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = subtotal * 0.18 // 18% VAT
    const shipping = order.shippingCost || 0
    const total = subtotal + tax + shipping

    // Generate conversation ID
    const conversationId = generateConversationId()
    const basketId = `basket_${order.id}_${Date.now()}`

    // Create basket items with selected currency (unit price conversion)
    const basketItems = order.items.map(item => createBasketItem({
      id: item.productId,
      name: item.product.name,
      category: item.product.category?.name || 'General',
      price: convertServer(item.price, baseCurrency, displayCurrency, rates),
      quantity: item.quantity
    }))

    // Add tax and shipping as basket items
    if (tax > 0) {
      basketItems.push({
        id: 'tax',
        name: 'KDV (%18)',
        category1: 'Tax',
        itemType: 'VIRTUAL',
        price: formatPrice(convertServer(tax, baseCurrency, displayCurrency, rates))
      })
    }

    if (shipping > 0) {
      basketItems.push({
        id: 'shipping',
        name: 'Kargo Ücreti',
        category1: 'Shipping',
        itemType: 'VIRTUAL',
        price: formatPrice(convertServer(shipping, baseCurrency, displayCurrency, rates))
      })
    }

    // Ensure paidPrice equals sum of basket items (rounded like İyzico expects)
    const basketTotal = basketItems.reduce((sum, bi) => sum + bi.price, 0)
    const totalConverted = formatPrice(basketTotal)

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
        price: totalConverted,
        paidPrice: totalConverted,
        currency: displayCurrency,
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
        // Kur bilgisi ve 3DS akışı için ödenecek tutarı kaydet
        const baseRate = rates.find((r) => r.currency === baseCurrency)?.rate ?? 1
        const displayRate = rates.find((r) => r.currency === displayCurrency)?.rate ?? baseRate
        const conversionRate = displayRate / baseRate
        const rateTimestamp = rates.find((r) => r.currency === displayCurrency)?.updatedAt || new Date()

        await prisma.order.update({
          where: { id: order.id },
          data: {
            iyzicoConversationId: conversationId,
            paymentCurrency: displayCurrency,
            paidAmount: totalConverted,
            conversionRate,
            rateTimestamp,
            baseCurrencyAtPayment: baseCurrency,
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
        price: totalConverted,
        paidPrice: totalConverted,
        currency: displayCurrency,
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
        // Direkt ödemede para birimi, tutar ve kur bilgisini kaydet ve siparişi güncelle
        const baseRate = rates.find((r) => r.currency === baseCurrency)?.rate ?? 1
        const displayRate = rates.find((r) => r.currency === displayCurrency)?.rate ?? baseRate
        const conversionRate = displayRate / baseRate
        const rateTimestamp = rates.find((r) => r.currency === displayCurrency)?.updatedAt || new Date()

        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            iyzicoPaymentId: result.paymentId,
            iyzicoConversationId: conversationId,
            paidAt: new Date(),
            paymentCurrency: displayCurrency,
            paidAmount: totalConverted,
            conversionRate,
            rateTimestamp,
            baseCurrencyAtPayment: baseCurrency,
          }
        })

        // Sipariş e-postasını ortak fonksiyonla gönder
        try {
          await sendOrderReceivedEmail(order.id)
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