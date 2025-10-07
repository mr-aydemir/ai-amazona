import { NextRequest, NextResponse } from 'next/server'
// cookies kullanılmıyor; para birimi client’tan body ile alınacak
import { auth } from '@/auth'
import { iyzicoClient, createBasketItem, createBuyer, createAddress, formatPrice } from '@/lib/iyzico'
import { Iyzico3DSPaymentRequest } from '@/lib/iyzico'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrencyData, convertServer } from '@/lib/server-currency'

// Validation schema for 3DS payment request
const ThreeDSPaymentSchema = z.object({
  cardNumber: z.string().min(16).max(19),
  expireMonth: z.string().length(2),
  expireYear: z.string().length(2),
  cvc: z.string().min(3).max(4),
  cardHolderName: z.string().min(2),
  installment: z.number().min(1).max(12).default(1),
  saveCard: z.boolean().default(false),
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
  }),
  // Opsiyonel: taksit toplamı ve para birimi
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

    // Parse and validate request body
    const body = await request.json()
    const { orderId, ...paymentData } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Get the existing order
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        userId: session.user.id
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true
              }
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

    // Convert order items to cart items format for validation
    const cartItems = order.items.map(item => ({
      id: item.productId,
      name: item.product.name,
      price: item.price,
      quantity: item.quantity,
      category: item.product.category?.name || 'General'
    }))

    // Create shipping and billing address from order
    const shippingAddress = {
      fullName: order.shippingFullName,
      street: order.shippingStreet,
      city: order.shippingCity,
      state: order.shippingState,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry
    }

    const validatedData = {
      ...paymentData,
      cartItems,
      shippingAddress,
      billingAddress: shippingAddress // Use same address for billing
    }

    // Currency selection: body.currency varsa onu kullan, yoksa baseCurrency
    const { baseCurrency, rates } = await getCurrencyData()
    const providedCurrency = typeof body.currency === 'string' ? body.currency : undefined
    const rateCodes = new Set(rates.map(r => r.currency))
    const displayCurrency = (providedCurrency && rateCodes.has(providedCurrency)) ? providedCurrency : baseCurrency

    // Create basket items with selected currency (unit price conversion)
    const basketItems = validatedData.cartItems.map((ci:
      {
        id: string,
        name: string,
        category: string,
        price: number,
        quantity: number
      }) =>
      createBasketItem({
        id: ci.id,
        name: ci.name,
        category: ci.category || 'General',
        price: convertServer(ci.price, baseCurrency, displayCurrency, rates),
        quantity: ci.quantity
      })
    )

    // Get VAT rate and shipping flat fee from system settings
    const setting = await prisma.systemSetting.findFirst()
    const vatRate = typeof setting?.vatRate === 'number' ? setting!.vatRate : 0.1
    const shippingFlatFee = typeof setting?.shippingFlatFee === 'number' ? setting!.shippingFlatFee : 10

    // Compute base subtotal from original cart item prices (base currency)
    const baseSubtotal = validatedData.cartItems.reduce(
      (sum: number, ci: { price: number; quantity: number }) => sum + (ci.price * ci.quantity),
      0
    )
    const vatAmountBase = baseSubtotal * vatRate

    // Convert VAT and shipping to selected display currency
    const shippingConverted = convertServer(shippingFlatFee, baseCurrency, displayCurrency, rates)
    const vatConverted = convertServer(vatAmountBase, baseCurrency, displayCurrency, rates)

    // Add shipping and VAT as separate basket items only if positive (> 0)
    if (shippingConverted > 0) {
      basketItems.push(
        createBasketItem({
          id: 'shipping',
          name: 'Kargo',
          category: 'Shipping',
          price: shippingConverted,
          quantity: 1,
        })
      )
    }
    if (vatConverted > 0) {
      basketItems.push(
        createBasketItem({
          id: 'vat',
          name: 'KDV',
          category: 'Tax',
          price: vatConverted,
          quantity: 1,
        })
      )
    }

    // Calculate totals from basket items to ensure consistency
    const basketTotal = basketItems.reduce((sum: any, item: any) => sum + item.price, 0)
    const totalPrice = formatPrice(basketTotal)
    // Baz toplam (taban para biriminde)
    const baseTotalBase = baseSubtotal + vatAmountBase + shippingFlatFee
    // Ödenecek tutar (görünür para biriminde): taksit toplamı varsa onu kullan
    const paidAmountDisplay = typeof validatedData.installmentTotalPrice === 'number' ? validatedData.installmentTotalPrice : totalPrice
    const fromCurrency = typeof validatedData.installmentCurrency === 'string' ? validatedData.installmentCurrency : displayCurrency
    const baseRateForFee = rates.find(r => r.currency === baseCurrency)?.rate ?? 1
    const fromRateForFee = rates.find(r => r.currency === fromCurrency)?.rate ?? baseRateForFee
    const installmentTotalBase = paidAmountDisplay * (baseRateForFee / fromRateForFee)
    const serviceFeeBase = Math.max(0, installmentTotalBase - baseTotalBase)

    // Create buyer object
    const buyer = createBuyer(session.user, validatedData.shippingAddress)

    // Create addresses
    const iyzicoShippingAddress = createAddress(validatedData.shippingAddress)
    const iyzicoBillingAddress = createAddress(validatedData.billingAddress)

    // Generate unique conversation and basket IDs with user ID embedded
    const conversationId = `conv_${session.user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const basketId = `basket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Update order with conversationId and save card info if requested
    console.log('🔄 Updating order with 3DS info:', {
      orderId,
      conversationId,
      saveCard: validatedData.saveCard,
      cardNumber: validatedData.cardNumber.replace(/\s/g, '').slice(-4)
    })

    // Kur bilgisi ve ödenecek tutarı kaydet
    const baseRate = rates.find((r) => r.currency === baseCurrency)?.rate ?? 1
    const displayRate = rates.find((r) => r.currency === displayCurrency)?.rate ?? baseRate
    const conversionRate = displayRate / baseRate
    const rateTimestamp = rates.find((r) => r.currency === displayCurrency)?.updatedAt || new Date()

    await prisma.order.update({
      where: { id: orderId },
      data: {
        iyzicoConversationId: conversationId,
        installmentCount: validatedData.installment || 1,
        paymentCurrency: displayCurrency,
        paidAmount: formatPrice(paidAmountDisplay),
        conversionRate,
        rateTimestamp,
        baseCurrencyAtPayment: baseCurrency,
        serviceFee: serviceFeeBase,
        ...(validatedData.saveCard && {
          saveCardRequested: true,
          cardInfo: JSON.stringify({
            cardNumber: validatedData.cardNumber.replace(/\s/g, ''),
            cardHolderName: validatedData.cardHolderName,
            expireMonth: validatedData.expireMonth,
            expireYear: validatedData.expireYear
          })
        })
      }
    })

    console.log('✅ Order updated with 3DS info and card save request')

    // Prepare 3DS payment request
    const threeDSPaymentRequest: Iyzico3DSPaymentRequest = {
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
        cardNumber: validatedData.cardNumber.replace(/\s/g, ''), // Remove spaces
        expireMonth: validatedData.expireMonth,
        expireYear: validatedData.expireYear,
        cvc: validatedData.cvc,
        cardHolderName: validatedData.cardHolderName
      },
      buyer,
      shippingAddress: iyzicoShippingAddress,
      billingAddress: iyzicoBillingAddress,
      basketItems,
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/iyzico/3ds-callback`
    }

    // Make 3DS payment request to İyzico
    const result = await iyzicoClient.create3DSPayment(threeDSPaymentRequest)

    // Check if 3DS initialization was successful
    if (result.status === 'success') {
      return NextResponse.json({
        success: true,
        threeDSHtmlContent: result.threeDSHtmlContent,
        paymentId: result.paymentId,
        conversationId: result.conversationId,
        status: result.status,
        message: '3D Secure authentication required'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.errorMessage || '3D Secure initialization failed',
        errorCode: result.errorCode,
        status: result.status
      }, { status: 400 })
    }

  } catch (error) {
    console.error('3DS payment error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}