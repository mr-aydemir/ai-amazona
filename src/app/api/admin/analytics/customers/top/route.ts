import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const now = new Date()
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : now
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const limit = parseInt(searchParams.get('limit') || '10')
  const statuses: OrderStatus[] = [OrderStatus.PAID, OrderStatus.DELIVERED]

  const grouped = await prisma.order.groupBy({
    by: ['userId'],
    where: { status: { in: statuses }, createdAt: { gte: from, lte: to } },
    _sum: { total: true },
    _count: { _all: true },
  })

  const sorted = grouped.sort((a, b) => (b._sum.total! - a._sum.total!)).slice(0, limit)
  const userIds = sorted.map((g) => g.userId)
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
  const userMap = new Map(users.map((u) => [u.id, u]))

  const result = sorted.map((g) => ({
    userId: g.userId,
    name: userMap.get(g.userId)?.name || null,
    email: userMap.get(g.userId)?.email || null,
    revenue: g._sum.total || 0,
    orders: g._count._all || 0,
  }))

  return NextResponse.json({ customers: result, from, to })
}