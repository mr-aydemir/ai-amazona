import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

interface CartItem {
  id: string
  productId: string
  quantity: number
  price: number
}

interface ShippingInfo {
  fullName: string
  email: string
  phone: string
  tcNumber: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

interface OrderBody {
  items: CartItem[]
  shippingInfo: ShippingInfo
  total: number
}

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      console.log('[ORDERS_POST] No user ID found in session')
      return new NextResponse('Unauthorized: User ID is required', {
        status: 401,
      })
    }

    const body = await req.json()
    const { items, shippingInfo, total } = body as OrderBody

    if (!items?.length) {
      return new NextResponse('Bad Request: Cart items are required', {
        status: 400,
      })
    }

    if (!shippingInfo) {
      return new NextResponse('Bad Request: Shipping information is required', {
        status: 400,
      })
    }

    // Verify all products exist and are in stock
    const productIds = items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    })

    // Check if all products exist
    if (products.length !== items.length) {
      const foundProductIds = products.map((p) => p.id)
      const missingProductIds = productIds.filter(
        (id) => !foundProductIds.includes(id)
      )
      return new NextResponse(
        `Products not found: ${missingProductIds.join(', ')}`,
        {
          status: 400,
        }
      )
    }

    // Check stock levels
    const insufficientStock = items.filter((item) => {
      const product = products.find((p) => p.id === item.productId)
      return product && product.stock < item.quantity
    })

    if (insufficientStock.length > 0) {
      return new NextResponse(
        `Insufficient stock for products: ${insufficientStock
          .map((item) => item.productId)
          .join(', ')}`,
        { status: 400 }
      )
    }

    // Create shipping address
    const address = await prisma.address.create({
      data: {
        fullName: shippingInfo.fullName,
        street: shippingInfo.street,
        city: shippingInfo.city,
        state: shippingInfo.state,
        postalCode: shippingInfo.postalCode,
        country: shippingInfo.country,
        phone: shippingInfo.phone,
        tcNumber: shippingInfo.tcNumber,
        user: {
          connect: {
            id: session.user.id,
          },
        },
      },
    })

    // Start a transaction to ensure all operations succeed or fail together
    console.log('[ORDERS_POST] Starting transaction...')
    const order = await prisma.$transaction(async (tx) => {
      try {
        console.log('[ORDERS_POST] Creating order...')
        // Create order with items
        const newOrder = await tx.order.create({
          data: {
            userId: session.user.id,
            addressId: address.id,
            total,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
              })),
            },
          },
          include: {
            items: true,
            shippingAddress: true,
          },
        })

        console.log('[ORDERS_POST] Order created with ID:', newOrder.id)
        console.log('[ORDERS_POST] Order userId:', newOrder.userId)
        console.log('[ORDERS_POST] Order total:', newOrder.total)

        console.log('[ORDERS_POST] Updating product stock levels...')
        // Update product stock levels
        for (const item of items) {
          console.log('[ORDERS_POST] Updating stock for product:', item.productId, 'quantity:', item.quantity)
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          })
        }

        console.log('[ORDERS_POST] Clearing user cart...')
        // Clear the user's cart if it exists - first delete cart items, then cart
        try {
          const userCart = await tx.cart.findUnique({
            where: { userId: session.user.id },
            include: { items: true }
          })

          if (userCart) {
            console.log('[ORDERS_POST] Found cart with', userCart.items.length, 'items')

            // First delete all cart items
            await tx.cartItem.deleteMany({
              where: { cartId: userCart.id }
            })
            console.log('[ORDERS_POST] Deleted cart items')

            // Then delete the cart
            await tx.cart.delete({
              where: { id: userCart.id }
            })
            console.log('[ORDERS_POST] Deleted cart')
          } else {
            console.log('[ORDERS_POST] No cart found for user')
          }
        } catch (error: any) {
          console.log('[ORDERS_POST] Cart deletion error:', error.message)
          // Don't throw error, just log it
        }

        console.log('[ORDERS_POST] Transaction completed successfully')
        return newOrder
      } catch (error) {
        console.error('[ORDERS_POST] Transaction error:', error)
        throw error
      }
    })

    console.log('[ORDERS_POST] Returning orderId:', order.id)
    return NextResponse.json({ orderId: order.id })
  } catch (error) {
    console.error('[ORDERS_POST]', error)
    if (error instanceof Error) {
      return new NextResponse(`Error: ${error.message}`, { status: 500 })
    }
    return new NextResponse('Internal error', { status: 500 })
  }
}
