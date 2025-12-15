import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { sendOrderShippedEmail } from '@/lib/order-email'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortByParam = (searchParams.get('sortBy') || 'createdAt') as 'createdAt' | 'total' | 'status' | 'id'
    const sortDirParam = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        {
          id: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          user: {
            email: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      ]
    }

    // Build orderBy safely using allowlist
    const allowedSortFields = new Set(['createdAt', 'total', 'status', 'id'])
    const allowedSortDir = new Set(['asc', 'desc'])
    const sortBy = allowedSortFields.has(sortByParam) ? sortByParam : 'createdAt'
    const sortDir = allowedSortDir.has(sortDirParam) ? sortDirParam : 'desc'

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  slug: true
                }
              }
            }
          },
        },
        orderBy: { [sortBy]: sortDir } as any,
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ])

    // Parse images from JSON strings to arrays for frontend
    const ordersWithParsedImages = orders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        ...item,
        product: {
          ...item.product,
          images: item.product.images ? JSON.parse(item.product.images) : []
        }
      }))
    }))

    return NextResponse.json({
      orders: ordersWithParsedImages,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, status, trackingNumber, trackingUrl, carrier } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Build update payload dynamically
    const data: any = {}

    if (status) {
      const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAID']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        )
      }
      data.status = status
    }

    if (typeof trackingNumber === 'string') {
      const trimmed = trackingNumber.trim()
      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: 'Tracking number cannot be empty' },
          { status: 400 }
        )
      }
      // Optional: auto set SHIPPED when tracking number is provided
      if (!data.status) {
        data.status = 'SHIPPED'
      }
      data.shippingTrackingNumber = trimmed
    }

    if (typeof trackingUrl === 'string') {
      const trimmedUrl = trackingUrl.trim()
      if (trimmedUrl.length === 0) {
        return NextResponse.json(
          { error: 'Tracking URL cannot be empty' },
          { status: 400 }
        )
      }
      // Basic validation for URL pattern
      const isHttp = /^https?:\/\//i.test(trimmedUrl)
      if (!isHttp) {
        return NextResponse.json(
          { error: 'Tracking URL must start with http or https' },
          { status: 400 }
        )
      }
      if (!data.status) {
        data.status = 'SHIPPED'
      }
      data.shippingTrackingUrl = trimmedUrl
    }

    if (typeof carrier === 'string') {
      const allowedCarriers = new Set(['ARAS', 'DHL', 'YURTICI', 'SURAT', 'PTT', 'HEPSIJET'])
      const upper = carrier.toUpperCase()
      if (!allowedCarriers.has(upper)) {
        return NextResponse.json(
          { error: 'Invalid carrier' },
          { status: 400 }
        )
      }
      data.shippingCarrier = upper
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Siparişin önceki durumunu al (e-posta tetikleme için karşılaştırma)
    const previousOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true }
    })

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                slug: true
              }
            }
          }
        },
      }
    })

    // Parse images from JSON strings to arrays for frontend
    const orderWithParsedImages = {
      ...updatedOrder,
      items: updatedOrder.items.map(item => ({
        ...item,
        product: {
          ...item.product,
          images: item.product.images ? JSON.parse(item.product.images) : []
        }
      }))
    }

    // Kargolandı e-postasını tetikle: durum SHIPPED'a geçerse veya takip numarası sağlanırsa
    try {
      const statusChangedToShipped = data.status === 'SHIPPED' && previousOrder?.status !== 'SHIPPED'
      const trackingProvided = (
        (typeof data.shippingTrackingNumber === 'string' && data.shippingTrackingNumber.length > 0) ||
        (typeof data.shippingTrackingUrl === 'string' && data.shippingTrackingUrl.length > 0)
      )
      if (statusChangedToShipped || trackingProvided) {
        await sendOrderShippedEmail(orderId)
      }
    } catch (err) {
      console.error('[ADMIN_ORDERS] Failed to send shipped email:', err)
      // E-posta hatası kullanıcıya gösterilmez; sipariş güncellemesi başarıyla devam eder
    }

    // Kullanıcı bildirimi oluştur (ORDER_SHIPPED)
    try {
      const shouldNotify = data.status === 'SHIPPED' && previousOrder?.status !== 'SHIPPED'
      if (shouldNotify) {
        const orderUser = updatedOrder.user
        if (orderUser?.id) {
          await prisma.notification.create({
            data: {
              userId: orderUser.id,
              type: 'ORDER_SHIPPED',
              title: 'Siparişiniz kargoya verildi',
              message: `#${updatedOrder.id} numaralı siparişiniz kargoya verildi.`,
              orderId: updatedOrder.id,
            },
          })
        }
      }
    } catch (err) {
      console.error('[ADMIN_ORDERS] Failed to create notification:', err)
    }

    return NextResponse.json(orderWithParsedImages)

  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}