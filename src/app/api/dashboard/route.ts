import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [ordersCount, addressesCount, user] = await Promise.all([
      prisma.order.count({
        where: { userId: session.user.id },
      }),
      prisma.address.count({
        where: { userId: session.user.id },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              total: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      ordersCount,
      addressesCount,
      user: user ? { name: user.name } : null,
      recentOrders: user?.orders ?? [],
    })
  } catch (error) {
    console.error('[DASHBOARD_GET_ERROR]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}