import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getCurrencyData, convertServer } from '@/lib/server-currency'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { baseCurrency, rates } = await getCurrencyData()
    let displayCurrency = baseCurrency
    try {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferredLocale: true }
      })
      displayCurrency = u?.preferredLocale === 'en' ? 'USD' : baseCurrency
    } catch (e) {
      displayCurrency = baseCurrency
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    // Parse product images from JSON string to array for frontend usage
    const normalized = orders.map((order) => {
      const displayTotal = convertServer(order.total, baseCurrency, displayCurrency, rates)
      const displayShipping = convertServer(order.shippingCost || 0, baseCurrency, displayCurrency, rates)
      return {
        ...order,
        currency: displayCurrency,
        displayTotal,
        displayShippingCost: displayShipping,
        items: order.items.map((item) => ({
          ...item,
          displayPrice: convertServer(item.price, baseCurrency, displayCurrency, rates),
          product: {
            ...item.product,
            images: item.product.images ? (() => {
              try { return JSON.parse(item.product.images) } catch { return [] }
            })() : []
          }
        }))
      }
    })

    return NextResponse.json({ orders: normalized, currency: displayCurrency })
  } catch (error) {
    console.error('[ORDERS_LIST_ERROR]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { items, shippingInfo } = body as {
      items: Array<{ productId?: string; id?: string; quantity: number } & Record<string, any>>
      shippingInfo: {
        fullName: string
        email?: string
        phone?: string
        tcNumber?: string
        street: string
        city: string
        state: string
        postalCode: string
        country: string
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      )
    }

    if (!shippingInfo || !shippingInfo.fullName || !shippingInfo.street || !shippingInfo.city || !shippingInfo.state || !shippingInfo.postalCode || !shippingInfo.country) {
      return NextResponse.json(
        { error: 'Shipping information is incomplete' },
        { status: 400 }
      )
    }

    // Recalculate totals from authoritative product prices
    // Support both `productId` and `id` coming from cart items
    const productIds = items
      .map((i) => i.productId || i.id)
      .filter((pid): pid is string => typeof pid === 'string' && pid.length > 0)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true }
    })

    const priceMap = new Map(products.map((p) => [p.id, p.price]))
    const orderItems = items.map((i) => {
      const pid = i.productId || i.id
      const unitPrice = pid ? priceMap.get(pid) : undefined
      if (!unitPrice) {
        throw new Error(`Product not found: ${pid ?? 'unknown'}`)
      }
      const qty = Math.max(1, Number(i.quantity) || 1)
      return {
        productId: pid as string,
        quantity: qty,
        price: unitPrice,
      }
    })

    const subtotal = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0)
    // System settings for VAT and shipping
    const setting = await prisma.systemSetting.findFirst()
    const vatRate = typeof setting?.vatRate === 'number' ? setting!.vatRate : 0.1
    const shippingFlatFee = typeof setting?.shippingFlatFee === 'number' ? setting!.shippingFlatFee : 10
    const freeShippingThreshold = typeof setting?.freeShippingThreshold === 'number' ? setting!.freeShippingThreshold : 0
    const shippingCost = subtotal >= freeShippingThreshold && freeShippingThreshold > 0 ? 0 : shippingFlatFee
    const taxAmount = subtotal * vatRate
    const total = subtotal + shippingCost + taxAmount

    // Snapshot user preferred currency on order (will be finalised at payment)
    const { baseCurrency } = await getCurrencyData()
    let paymentCurrency = baseCurrency
    try {
      const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { preferredLocale: true } })
      paymentCurrency = u?.preferredLocale === 'en' ? 'USD' : baseCurrency
    } catch (e) {
      paymentCurrency = baseCurrency
    }

    const shippingEmail = session.user.email || shippingInfo.email || ''

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        status: 'PENDING',
        total,
        paymentCurrency,
        shippingCost: shippingCost,
        shippingCity: shippingInfo.city,
        shippingCountry: shippingInfo.country,
        shippingEmail,
        shippingFullName: shippingInfo.fullName,
        shippingPhone: shippingInfo.phone || '',
        shippingPostalCode: shippingInfo.postalCode,
        shippingState: shippingInfo.state,
        shippingStreet: shippingInfo.street,
        shippingTcNumber: shippingInfo.tcNumber || null,
        items: {
          create: orderItems.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.price,
          })),
        },
      },
      select: { id: true },
    })

    return NextResponse.json({ orderId: order.id }, { status: 201 })
  } catch (error) {
    console.error('[ORDER_CREATE_ERROR]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
