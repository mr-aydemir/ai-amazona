import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'
import {
  iyzicoClient,
  IYZICO_CURRENCY,
  //IYZICO_PAYMENT_CHANNEL,
  IYZICO_PAYMENT_GROUP,
  formatPrice,
  generateConversationId,
  createBasketItem,
  createBuyer,
  createAddress,
  type IyzicoCheckoutFormRequest
} from '@/lib/iyzico'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Siparişi veritabanından al
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        },
        user: true,
        shippingAddress: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (order.status === OrderStatus.PAID) {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 })
    }

    // Toplam tutarı hesapla
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = subtotal * 0.18 // %18 KDV
    const shipping = order.shippingCost || 0
    const total = subtotal + tax + shipping

    // Conversation ID oluştur
    const conversationId = generateConversationId()

    // Sepet öğelerini oluştur - KDV ve kargo dahil
    const basketItems = order.items.map((item, index) => {
      const itemSubtotal = item.price * item.quantity
      const itemTax = itemSubtotal * 0.18

      // Kargo maliyetini ilk ürüne ekle
      const itemShipping = index === 0 ? shipping : 0

      const itemTotal = itemSubtotal + itemTax + itemShipping

      return createBasketItem({
        id: item.productId,
        name: item.product.name,
        category: item.product.category?.name || 'General',
        price: itemTotal / item.quantity, // Birim fiyat (KDV ve kargo dahil)
        quantity: item.quantity
      })
    })

    // Alıcı bilgilerini oluştur
    const buyer = createBuyer(order.user, order.shippingAddress)

    // Adres bilgilerini oluştur
    const shippingAddress = createAddress(order.shippingAddress)
    const billingAddress = createAddress(order.shippingAddress) // Use shipping address as billing address

    // İyzico checkout form request'i oluştur
    const checkoutFormRequest: IyzicoCheckoutFormRequest = {
      locale: 'tr',
      conversationId,
      price: formatPrice(total),
      paidPrice: formatPrice(total),
      currency: IYZICO_CURRENCY,
      basketId: orderId,
      paymentGroup: IYZICO_PAYMENT_GROUP,
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/iyzico/callback`,
      enabledInstallments: [1, 2, 3, 4, 6, 9, 12],
      buyer,
      shippingAddress,
      billingAddress,
      basketItems
    }

    // İyzico checkout form'u başlat
    const result = await iyzicoClient.initializeCheckoutForm(checkoutFormRequest)

    if (result.status !== 'success') {
      return NextResponse.json({
        error: 'Payment initialization failed',
        details: result.errorMessage
      }, { status: 400 })
    }

    // Siparişi güncelle
    await prisma.order.update({
      where: { id: orderId },
      data: {
        iyzicoConversationId: conversationId,
        iyzicoToken: result.token
      }
    })

    return NextResponse.json({
      success: true,
      checkoutFormContent: result.checkoutFormContent,
      paymentPageUrl: result.paymentPageUrl,
      token: result.token
    })

  } catch (error) {
    console.error('İyzico payment error:', error)

    // Daha detaylı error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : 'UnknownError'
    }, { status: 500 })
  }
}