import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { iyzicoClient, createBasketItem, createBuyer, createAddress, formatPrice } from '@/lib/iyzico'
import { getCurrencyData, convertServer } from '@/lib/server-currency'
import { z } from 'zod'
import { sendOrderReceivedEmail } from '@/lib/order-email'

// Validation schema for direct payment request
const DirectPaymentSchema = z.object({
  orderId: z.string().min(1),
  cardNumber: z.string().min(15).max(19),
  expireMonth: z.string().length(2),
  expireYear: z.string().length(2),
  cvc: z.string().min(3).max(4),
  cardHolderName: z.string().min(2),
  installment: z.number().min(1).max(12).default(1),
  currency: z.string().optional(),
  saveCard: z.boolean().optional(),
  installmentTotalPrice: z.number().optional(),
  installmentCurrency: z.string().optional()
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

    // Parse and validate body
    const body = await request.json()
    const validatedData = DirectPaymentSchema.parse(body)

    // Load order with items
    const order = await prisma.order.findUnique({
      where: {
        id: validatedData.orderId,
        userId: session.user.id
      },
      include: {
        items: {
          include: {
            product: {
              include: { category: true }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Convert order items to basket items in base currency first
    const cartItems = order.items.map(item => ({
      id: item.productId,
      name: item.product.name,
      price: item.price,
      quantity: item.quantity,
      category: item.product.category?.name || 'General'
    }))

    // Currency settings
    const { baseCurrency, rates } = await getCurrencyData()
    const rateCodes = new Set(rates.map(r => r.currency))
    const displayCurrency = (typeof validatedData.currency === 'string' && rateCodes.has(validatedData.currency))
      ? validatedData.currency
      : baseCurrency

    // System settings for VAT and shipping
    const setting = await prisma.systemSetting.findFirst()
    const shippingFlatFee = typeof setting?.shippingFlatFee === 'number' ? setting!.shippingFlatFee : 0
    const vatRate = typeof setting?.vatRate === 'number' ? setting!.vatRate : 0.2

    // Build basket items with conversion
    const basketItems = cartItems.map(ci => createBasketItem({
      id: ci.id,
      name: ci.name,
      category: ci.category,
      price: convertServer(ci.price * ci.quantity, baseCurrency, displayCurrency, rates),
      quantity: 1
    }))

    // Compute VAT and shipping in display currency
    const baseSubtotal = cartItems.reduce((sum, ci) => sum + (ci.price * ci.quantity), 0)
    const vatAmountBase = baseSubtotal * vatRate
    const shippingConverted = convertServer(shippingFlatFee, baseCurrency, displayCurrency, rates)
    const vatConverted = convertServer(vatAmountBase, baseCurrency, displayCurrency, rates)

    // Add shipping and VAT items only if they are positive (İyzico requires > 0)
    if (shippingConverted > 0) {
      basketItems.push(
        createBasketItem({ id: 'shipping', name: 'Kargo', category: 'Shipping', price: shippingConverted, quantity: 1 })
      )
    }
    if (vatConverted > 0) {
      basketItems.push(
        createBasketItem({ id: 'vat', name: 'KDV', category: 'Tax', price: vatConverted, quantity: 1 })
      )
    }

    const basketTotal = basketItems.reduce((sum: any, item: any) => sum + item.price, 0)
    const totalPrice = formatPrice(basketTotal)

    // Service fee calculation in base currency (if provided)
    const baseTotalBase = baseSubtotal + vatAmountBase + shippingFlatFee
    const fromCurrency = typeof validatedData.installmentCurrency === 'string' ? validatedData.installmentCurrency : displayCurrency
    const baseRate = rates.find(r => r.currency === baseCurrency)?.rate ?? 1
    const fromRate = rates.find(r => r.currency === fromCurrency)?.rate ?? baseRate
    const installmentTotalDisplay = typeof validatedData.installmentTotalPrice === 'number' ? validatedData.installmentTotalPrice : basketTotal
    const installmentTotalBase = installmentTotalDisplay * (baseRate / fromRate)
    const serviceFeeBase = Math.max(0, installmentTotalBase - baseTotalBase)
    // Ödenecek tutar (görünür para biriminde): taksit toplamı varsa onu kullan
    const paidAmountDisplay = typeof validatedData.installmentTotalPrice === 'number' ? validatedData.installmentTotalPrice : totalPrice

    // Prepare buyer and addresses from order
    const shippingAddress = {
      fullName: order.shippingFullName,
      street: order.shippingStreet,
      city: order.shippingCity,
      state: order.shippingState,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry
    }
    // Use shipping address as billing address since billing fields are not stored
    const billingAddress = { ...shippingAddress }
    const buyer = createBuyer(session.user, shippingAddress)
    const iyzicoShippingAddress = createAddress(shippingAddress)
    const iyzicoBillingAddress = createAddress(billingAddress)

    // Generate conversation and basket IDs
    const conversationId = `conv_${session.user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const basketId = `basket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Compute and persist currency fields on order
    const displayRate = rates.find((r) => r.currency === displayCurrency)?.rate ?? baseRate
    const conversionRate = displayRate / baseRate
    const rateTimestamp = rates.find((r) => r.currency === displayCurrency)?.updatedAt || new Date()

    await prisma.order.update({
      where: { id: order.id },
      data: {
        iyzicoConversationId: conversationId,
        installmentCount: validatedData.installment || 1,
        paymentCurrency: displayCurrency,
        paidAmount: formatPrice(paidAmountDisplay),
        conversionRate,
        rateTimestamp,
        baseCurrencyAtPayment: baseCurrency,
        serviceFee: serviceFeeBase
      }
    })

    // Prepare direct payment request
    const directPaymentRequest = {
      locale: 'tr',
      conversationId,
      price: formatPrice(totalPrice),
      // İyzico için paidPrice taksit toplamı (komisyon dahil) olmalı
      paidPrice: formatPrice(paidAmountDisplay),
      currency: displayCurrency,
      basketId,
      paymentGroup: 'PRODUCT',
      paymentChannel: 'WEB',
      installment: validatedData.installment || 1,
      paymentCard: {
        cardNumber: validatedData.cardNumber.replace(/\s/g, ''),
        expireMonth: validatedData.expireMonth,
        expireYear: validatedData.expireYear,
        cvc: validatedData.cvc,
        cardHolderName: validatedData.cardHolderName
      },
      buyer,
      shippingAddress: iyzicoShippingAddress,
      billingAddress: iyzicoBillingAddress,
      basketItems
    }

    const result = await iyzicoClient.createDirectPayment(directPaymentRequest)

    if (result.status === 'success') {
      // Update order status and stock
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
      })

      // Send order received email
      try {
        await sendOrderReceivedEmail(order.id)
      } catch (emailError) {
        console.error('[EMAIL] Failed to send order received email:', emailError)
      }

      return NextResponse.json({
        success: true,
        paymentId: result.paymentId,
        conversationId: result.conversationId,
        status: result.status
      })
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          iyzicoPaymentStatus: result.paymentStatus || 'FAILURE',
          iyzicoErrorMessage: result.errorMessage || 'Payment failed'
        }
      })

      return NextResponse.json({
        success: false,
        error: result.errorMessage || 'Direct payment failed',
        errorCode: result.errorCode,
        status: result.status
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Direct payment error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}