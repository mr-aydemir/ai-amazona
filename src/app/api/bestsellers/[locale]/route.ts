
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrencyData } from '@/lib/server-currency'

export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  try {
    const { locale } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '18')
    const { baseCurrency, rates } = await getCurrencyData()

    // 1) Get order counts per product
    const grouped = await prisma.orderItem.groupBy({
      by: ['productId'],
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } },
      where: {},
    })

    // 2) Aggregate counts per variant group key (variantGroupId || id)
    const products = await prisma.product.findMany({
      where: { id: { in: grouped.map(g => g.productId as string) } },
      select: { id: true, variantGroupId: true },
    })
    const keyCount = new Map<string, number>()
    const idToKey = new Map<string, string>()
    products.forEach(p => {
      const key = p.variantGroupId || p.id
      idToKey.set(p.id, key)
    })
    grouped.forEach(g => {
      const pid = g.productId as string
      const key = idToKey.get(pid) || pid
      keyCount.set(key, (keyCount.get(key) || 0) + (g._count?._all || 0))
    })

    // 3) Sort keys by count desc and take top N
    let sortedKeys = Array.from(keyCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => k)

    if (sortedKeys.length === 0) {
      const allForKeys = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, variantGroupId: true },
        orderBy: { createdAt: 'desc' },
      })
      const seen = new Set<string>()
      const orderedDistinct: string[] = []
      for (const row of allForKeys) {
        const key = row.variantGroupId || row.id
        if (!seen.has(key)) {
          seen.add(key)
          orderedDistinct.push(key)
        }
      }
      sortedKeys = orderedDistinct.slice(0, limit)
    }

    // 4) Fetch products matching keys by id or variantGroupId, then pick one representative per key
    const raw = await prisma.product.findMany({
      where: {
        OR: [
          { id: { in: sortedKeys } },
          { variantGroupId: { in: sortedKeys } },
        ],
        status: 'ACTIVE',
      },
      include: {
        translations: {
          where: { OR: [{ locale }, { locale: { startsWith: locale } }] },
          select: { name: true, description: true, slug: true }
        },
      },
    })

    const keyToProduct = new Map<string, typeof raw[number]>()
    for (const p of raw) {
      const key = p.variantGroupId || p.id
      if (!keyToProduct.has(key)) keyToProduct.set(key, p)
    }
    const result = sortedKeys
      .map((k) => keyToProduct.get(k))
      .filter(Boolean)
      .map((p) => ({
        ...(p as any),
        slug: p!.translations?.[0]?.slug || (p as any).slug || p!.id,
        name: p!.translations?.[0]?.name || p!.name,
        description: p!.translations?.[0]?.description || p!.description,
      }))

    return NextResponse.json({ products: result, currency: baseCurrency, rates })
  } catch (error) {
    console.error('Bestsellers API Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}