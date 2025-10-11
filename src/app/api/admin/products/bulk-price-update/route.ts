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
    const raw = body?.multiplier ?? body?.ratio
    const multiplier = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))

    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      return NextResponse.json({ error: 'Geçerli bir çarpan giriniz (0’dan büyük sayı)' }, { status: 400 })
    }

    const products = await prisma.product.findMany({ select: { id: true, price: true } })
    let updated = 0
    for (const p of products) {
      const newPrice = Math.max(0, (p.price ?? 0) * multiplier)
      try {
        await prisma.product.update({ where: { id: p.id }, data: { price: newPrice } })
        updated += 1
      } catch (err) {
        // bireysel ürün hatalarını yut, devam et
        console.error('Bulk price update item error:', err)
      }
    }

    return NextResponse.json({ message: 'Fiyat güncelleme tamamlandı', updated, total: products.length })
  } catch (error) {
    console.error('[ADMIN_BULK_PRICE_UPDATE] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}