import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET - Get user's cart
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('GET /api/cart - Fetching cart for user:', session.user.id)

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    console.log('GET /api/cart - Cart found:', cart ? {
      id: cart.id,
      itemsCount: cart.items.length,
      items: cart.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        productName: item.product.name
      }))
    } : 'null')

    return NextResponse.json({ cart })
  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, quantity = 1 } = await request.json()

    console.log('POST /api/cart - Adding item:', { productId, quantity, userId: session.user.id })

    // Find or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: { items: true }
    })

    if (!cart) {
      console.log('POST /api/cart - Creating new cart for user:', session.user.id)
      cart = await prisma.cart.create({
        data: { userId: session.user.id },
        include: { items: true }
      })
    }

    // Check if item already exists in cart
    const existingItem = cart.items.find(item => item.productId === productId)

    if (existingItem) {
      console.log('POST /api/cart - Updating existing item quantity')
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      })
    } else {
      console.log('POST /api/cart - Adding new item to cart')
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity
        }
      })
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    console.log('POST /api/cart - Cart updated successfully')

    return NextResponse.json({ cart: updatedCart })
  } catch (error) {
    console.error('Error adding item to cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update cart item quantity
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, quantity } = await request.json()

    console.log('PATCH /api/cart - Updating item:', { productId, quantity, userId: session.user.id })

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: { items: true }
    })

    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
    }

    const cartItem = cart.items.find(item => item.productId === productId)

    if (!cartItem) {
      return NextResponse.json({ error: 'Item not found in cart' }, { status: 404 })
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      await prisma.cartItem.delete({
        where: { id: cartItem.id }
      })
    } else {
      // Update quantity
      await prisma.cartItem.update({
        where: { id: cartItem.id },
        data: { quantity }
      })
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    console.log('PATCH /api/cart - Cart updated successfully')

    return NextResponse.json({ cart: updatedCart })
  } catch (error) {
    console.error('Error updating cart item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Clear cart
export async function DELETE() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('DELETE /api/cart - Clearing cart for user:', session.user.id)

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    })

    if (cart) {
      // Delete all cart items
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id }
      })

      console.log('DELETE /api/cart - Cart cleared successfully')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing cart:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}