import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const ratioPercentRaw = body?.ratioPercent
    const multiplierRaw = body?.multiplier
    const onlyIfMissing = !!body?.onlyIfMissing
    const categoryId = body?.categoryId ? String(body.categoryId) : undefined

    let ratio: number | null = null
    if (typeof ratioPercentRaw === 'number') ratio = ratioPercentRaw / 100
    if (ratio == null && typeof multiplierRaw === 'number') ratio = multiplierRaw - 1
    if (ratio == null) {
      const r = parseFloat(String(ratioPercentRaw ?? ''))
      if (Number.isFinite(r)) ratio = r / 100
    }
    if (ratio == null) {
      const m = parseFloat(String(multiplierRaw ?? ''))
      if (Number.isFinite(m)) ratio = m - 1
    }

    if (!Number.isFinite(ratio!) || (ratio as number) <= 0) {
      return NextResponse.json({ error: 'Geçerli bir oran/çarpan giriniz (0’dan büyük sayı)' }, { status: 400 })
    }

    const r = ratio as number

    // Build WHERE clause parts
    const whereParts: string[] = []
    const params: any[] = []
    if (categoryId) {
      whereParts.push(`"categoryId" = $${params.length + 1}`)
      params.push(categoryId)
    }
    if (onlyIfMissing) {
      whereParts.push(`("originalPrice" IS NULL OR "originalPrice" <= 0)`) 
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''

    // Update originalPrice = ROUND(price * (1 + r), 2)
    const sql = `UPDATE "Product" SET "originalPrice" = ROUND(("price" * (1 + $${params.length + 1}))::numeric, 2)::double precision ${whereSql}`
    const execParams = [...params, r]
    const result = await prisma.$executeRawUnsafe(sql, ...execParams)

    // Count affected rows is not returned by all drivers via $executeRaw; provide a follow-up count
    const countWhere: any = {}
    if (categoryId) countWhere.categoryId = categoryId
    const total = await prisma.product.count({ where: countWhere })

    return NextResponse.json({ message: 'Eski fiyatlar güncellendi', updated: Number(result) || undefined, total, filteredByCategoryId: categoryId || null, onlyIfMissing })
  } catch (error) {
    console.error('[ADMIN_BULK_ORIGINAL_PRICE_UPDATE] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}