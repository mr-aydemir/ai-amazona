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

function bucketKey(d: Date, granularity: string) {
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  if (granularity === 'month') return `${year}-${month}`
  if (granularity === 'week') {
    // ISO week number approximation
    const tmp = new Date(Date.UTC(year, d.getUTCMonth(), d.getUTCDate()))
    const dayNum = (tmp.getUTCDay() + 6) % 7
    tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3)
    const week1 = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4))
    const week = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7)
    return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
  }
  return `${year}-${month}-${day}`
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const { from, to } = parseRange(searchParams)
  const granularity = searchParams.get('granularity') || 'day'
  const statuses: OrderStatus[] = [OrderStatus.PAID, OrderStatus.DELIVERED]

  const firsts = await prisma.order.groupBy({
    by: ['userId'],
    where: { status: { in: statuses } },
    _min: { createdAt: true },
  })

  const buckets = new Map<string, number>()
  for (const f of firsts) {
    const firstDate = f._min.createdAt
    if (!firstDate) continue
    if (firstDate >= from && firstDate <= to) {
      const key = bucketKey(firstDate, granularity!)
      buckets.set(key, (buckets.get(key) || 0) + 1)
    }
  }

  const result = Array.from(buckets.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([period, count]) => ({ period, count }))
  return NextResponse.json({ buckets: result })
}