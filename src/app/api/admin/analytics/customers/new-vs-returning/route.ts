import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

function parseRange(searchParams: URLSearchParams) {
  const fromRaw = searchParams.get('from')
  const toRaw = searchParams.get('to')
  const now = new Date()
  const to = toRaw ? new Date(toRaw) : now
  const from = fromRaw ? new Date(fromRaw) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return { from, to }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const { from, to } = parseRange(searchParams)

  const statuses: OrderStatus[] = [OrderStatus.PAID, OrderStatus.DELIVERED]

  // İlk sipariş tarihi (min createdAt) per user
  const firsts = await prisma.order.groupBy({
    by: ['userId'],
    where: { status: { in: statuses } },
    _min: { createdAt: true },
  })
  const inPeriodOrders = await prisma.order.findMany({
    where: { status: { in: statuses }, createdAt: { gte: from, lte: to } },
    select: { userId: true },
  })
  const inPeriodSet = new Set(inPeriodOrders.map((o) => o.userId))

  let newCount = 0
  let returningCount = 0
  for (const f of firsts) {
    const firstDate = f._min.createdAt
    if (!firstDate) continue
    if (firstDate >= from && firstDate <= to) newCount++
    else if (firstDate < from && inPeriodSet.has(f.userId)) returningCount++
  }

  return NextResponse.json({ newCount, returningCount })
}

