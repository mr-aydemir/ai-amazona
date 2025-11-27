import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { iyzicoClient, createBasketItem, createBuyer, createAddress, formatPrice } from '@/lib/iyzico'
import { getCurrencyData, convertServer } from '@/lib/server-currency'
import { z } from 'zod'
import { sendOrderReceivedEmail, sendStaffOrderNotification } from '@/lib/order-email'

const SavedCardPaymentSchema = z.object({
  orderId: z.string().min(1),
  cardToken: z.string().min(1),
  installment: z.number().min(1).max(12).default(1),
  use3DS: z.boolean().default(false),
  currency: z.string().optional(),
  installmentTotalPrice: z.number().optional(),
  installmentCurrency: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = SavedCardPaymentSchema.parse(body)

    // Find order
    const order = await prisma.order.findUnique({
      where: { id: validated.orderId, userId: session.user.id },
      include: {
        items: { include: { product: { include: { category: true } } } }
      }
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Find saved card by token for this user
    const savedCard = await prisma.savedCard.findFirst({
      where: { userId: session.user.id, cardToken: validated.cardToken }
    })
    if (!savedCard) {
      return NextResponse.json({ error: 'Saved card not found' }, { status: 404 })
    }

    // Currency data
    const { baseCurrency, rates } = await getCurrencyData()
    const rateCodes = new Set(rates.map(r => r.currency))
    const displayCurrency = (typeof validated.currency === 'string' && rateCodes.has(validated.currency))
      ? validated.currency
      : baseCurrency

    // System settings for VAT and shipping
    const setting = await prisma.systemSetting.findFirst()
    const shippingFlatFee = typeof setting?.shippingFlatFee === 'number' ? setting!.shippingFlatFee : 0
    const vatRate = typeof setting?.vatRate === 'number' ? setting!.vatRate : 0.2

    // Build basket items
    const cartItems = order.items.map(item => ({
      id: item.productId,
      name: item.product.name,
      price: item.price,
      quantity: item.quantity,
      category: item.product.category?.name || 'General'
    }))

    const basketItems = cartItems.map(ci => createBasketItem({
      id: ci.id,
      name: ci.name,
      category: ci.category,
      price: convertServer(ci.price * ci.quantity, baseCurrency, displayCurrency, rates),
      quantity: 1
    }))

    const baseSubtotal = cartItems.reduce((sum, ci) => sum + (ci.price * ci.quantity), 0)
    const vatAmountBase = baseSubtotal * vatRate
    const shippingConverted = convertServer(shippingFlatFee, baseCurrency, displayCurrency, rates)
    const vatConverted = convertServer(vatAmountBase, baseCurrency, displayCurrency, rates)

    // Add shipping and VAT items only if they are positive (İyzico requires > 0)
    if (shippingConverted > 0) {
      basketItems.push(createBasketItem({ id: 'shipping', name: 'Kargo', category: 'Shipping', price: shippingConverted, quantity: 1 }))
    }
    if (vatConverted > 0) {
      basketItems.push(createBasketItem({ id: 'vat', name: 'KDV', category: 'Tax', price: vatConverted, quantity: 1 }))
    }

    const basketTotal = basketItems.reduce((sum: any, item: any) => sum + item.price, 0)
    const totalPrice = formatPrice(basketTotal)

    // Service fee calculation in base currency (if provided)
    const baseTotalBase = baseSubtotal + vatAmountBase + shippingFlatFee
    const fromCurrency = typeof validated.installmentCurrency === 'string' ? validated.installmentCurrency : displayCurrency
    const baseRate = rates.find(r => r.currency === baseCurrency)?.rate ?? 1
    const fromRate = rates.find(r => r.currency === fromCurrency)?.rate ?? baseRate
    const installmentTotalDisplay = typeof validated.installmentTotalPrice === 'number' ? validated.installmentTotalPrice : basketTotal
    const installmentTotalBase = installmentTotalDisplay * (baseRate / fromRate)
    const serviceFeeBase = Math.max(0, installmentTotalBase - baseTotalBase)

    // Addresses and buyer
    const shippingAddress = {
      fullName: order.shippingFullName,
      street: order.shippingStreet,
      city: order.shippingCity,
      state: order.shippingState,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry
    }
    // Billing fields are not stored; mirror shipping address for billing
    const billingAddress = { ...shippingAddress }
    const buyer = createBuyer(session.user, shippingAddress)
    const iyzicoShippingAddress = createAddress(shippingAddress)
    const iyzicoBillingAddress = createAddress(billingAddress)

    const conversationId = `conv_${session.user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const basketId = `basket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const displayRate = rates.find(r => r.currency === displayCurrency)?.rate ?? baseRate
    const conversionRate = displayRate / baseRate
    const rateTimestamp = rates.find(r => r.currency === displayCurrency)?.updatedAt || new Date()
    // Ödenecek tutar (görünür para biriminde): taksit toplamı varsa onu kullan
    const paidAmountDisplay = typeof validated.installmentTotalPrice === 'number' ? validated.installmentTotalPrice : totalPrice

    await prisma.order.update({
      where: { id: order.id },
      data: {
        iyzicoConversationId: conversationId,
        installmentCount: validated.installment || 1,
        paymentCurrency: displayCurrency,
        paidAmount: formatPrice(paidAmountDisplay),
        conversionRate,
        rateTimestamp,
        baseCurrencyAtPayment: baseCurrency,
        serviceFee: serviceFeeBase
      }
    })

    if (validated.use3DS) {
      const result = await iyzicoClient.payWithSavedCard3DS({
        locale: 'tr',
        conversationId,
        price: formatPrice(totalPrice),
        paidPrice: formatPrice(totalPrice),
        currency: displayCurrency,
        basketId,
        paymentGroup: 'PRODUCT',
        paymentChannel: 'WEB',
        installment: validated.installment || 1,
        paymentCard: {
          cardUserKey: savedCard.cardUserKey,
          cardToken: savedCard.cardToken
        },
        buyer,
        shippingAddress: iyzicoShippingAddress,
        billingAddress: iyzicoBillingAddress,
        basketItems,
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/iyzico/3ds-callback`
      })

      if (result.status === 'success') {
        return NextResponse.json({
          success: true,
          threeDSHtmlContent: result.threeDSHtmlContent,
          paymentId: result.paymentId,
          conversationId: result.conversationId,
          status: result.status
        })
      }

      return NextResponse.json({
        success: false,
        error: result.errorMessage || '3DS initialization failed',
        errorCode: result.errorCode,
        status: result.status
      }, { status: 400 })
    }

    // Non-3DS direct payment with saved card
    const result = await iyzicoClient.payWithSavedCard({
      locale: 'tr',
      conversationId,
      price: formatPrice(totalPrice),
      // İyzico için paidPrice taksit toplamı (komisyon dahil) olmalı
      paidPrice: formatPrice(paidAmountDisplay),
      currency: displayCurrency,
      basketId,
      paymentGroup: 'PRODUCT',
      paymentChannel: 'WEB',
      installment: validated.installment || 1,
      paymentCard: {
        cardUserKey: savedCard.cardUserKey,
        cardToken: savedCard.cardToken
      },
      buyer,
      shippingAddress: iyzicoShippingAddress,
      billingAddress: iyzicoBillingAddress,
      basketItems
    })

    if (result.status === 'success') {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            iyzicoPaymentId: result.paymentId,
            iyzicoPaymentStatus: result.paymentStatus || 'SUCCESS',
            paidAt: new Date()
          }
        })

        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          })
        }

        if (order.appliedCouponId && (order.couponDiscount || 0) > 0) {
          await tx.couponRedemption.create({
            data: {
              couponId: order.appliedCouponId,
              userId: order.userId,
              orderId: order.id,
              discountApplied: order.couponDiscount || 0
            }
          })
        }
      })

      try {
        await sendOrderReceivedEmail(order.id)
      } catch (emailError) {
        console.error('[EMAIL] Failed to send order received email:', emailError)
      }

      // Staff notification email
      try {
        await sendStaffOrderNotification(order.id)
      } catch (staffEmailError) {
        console.error('[STAFF_EMAIL] Failed to send staff order notification:', staffEmailError)
      }

      return NextResponse.json({ success: true, paymentId: result.paymentId, conversationId: result.conversationId, status: result.status })
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        iyzicoPaymentStatus: result.paymentStatus || 'FAILURE',
        iyzicoErrorMessage: result.errorMessage || 'Payment failed'
      }
    })

    return NextResponse.json({
      success: false,
      error: result.errorMessage || 'Saved card payment failed',
      errorCode: result.errorCode,
      status: result.status
    }, { status: 400 })

  } catch (error) {
    console.error('Saved card payment error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
