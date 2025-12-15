/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateCoupon, applyAmountOrPercent } from '@/lib/coupons'
import Stripe from 'stripe'
import { auth } from '@/auth'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { items, shippingAddress, couponCode } = body

    if (!items?.length || !shippingAddress) {
      return new NextResponse('Bad request', { status: 400 })
    }

    // Create Stripe payment intent
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: [item.image],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }))

    // Calculate discount for coupon if provided
    let discount = 0
    let couponAppliedId: string | null = null
    if (typeof couponCode === 'string') {
      const v = await validateCoupon(couponCode)
      if (v.ok) {
        const cart = { items: (items || []).map((it: any) => ({ productId: it.id, categoryId: it.categoryId, price: it.price, quantity: it.quantity })) }
        if (v.coupon!.discountType === 'AMOUNT' || v.coupon!.discountType === 'PERCENT') {
          discount = applyAmountOrPercent(v.coupon!, cart).discount
          couponAppliedId = v.coupon!.id
        }
      }
    }

    const subtotal = items.reduce((total: number, item: any) => total + item.price * item.quantity, 0)
    
    // Fetch system settings
    const setting = await prisma.systemSetting.findFirst()
    const vatRate = typeof setting?.vatRate === 'number' ? setting!.vatRate : 0.1
    const shippingFlatFee = typeof setting?.shippingFlatFee === 'number' ? setting!.shippingFlatFee : 10
    const freeShippingThreshold = typeof setting?.freeShippingThreshold === 'number' ? setting!.freeShippingThreshold : 0
    const shippingCost = subtotal >= freeShippingThreshold && freeShippingThreshold > 0 ? 0 : shippingFlatFee
    const taxAmount = subtotal * vatRate

    const orderTotal = subtotal - discount + shippingCost + taxAmount

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        status: 'PENDING',
        total: orderTotal,
        appliedCouponId: couponAppliedId || null,
        couponDiscount: discount || 0,
        taxPrice: taxAmount,
        shippingCost: shippingCost,
        serviceFee: 0,
        shippingFullName: shippingAddress.fullName,
        shippingStreet: shippingAddress.street,
        shippingCity: shippingAddress.city,
        shippingState: shippingAddress.state,
        shippingPostalCode: shippingAddress.postalCode,
        shippingCountry: shippingAddress.country,
        shippingPhone: shippingAddress.phone,
        shippingEmail: session.user.email || '',
        shippingTcNumber: shippingAddress.tcNumber,
        items: {
          create: items.map((item: any) => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
            taxRate: vatRate,
          })),
        },
        // Optionally record coupon redemption snapshot after payment succeeds; here we only attach metadata via Stripe
      },
    })

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: 'usd',
      metadata: {
        orderId: order.id,
        couponId: couponAppliedId || '',
        discount: String(discount),
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
    })
  } catch (error) {
    console.error('[CHECKOUT_ERROR]', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
