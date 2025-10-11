import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const rawLimit = searchParams.get('limit')
    const locale = searchParams.get('locale') || undefined
    let limit = Number(rawLimit ?? 50)
    if (!Number.isFinite(limit) || limit <= 0) limit = 50
    limit = Math.min(Math.max(1, Math.floor(limit)), 100)

    const baseArgs = {
      take: limit,
      orderBy: { createdAt: 'desc' as const },
    }

    const products = locale
      ? await prisma.product.findMany({
          ...baseArgs,
          include: {
            translations: {
              where: { locale },
              select: { name: true },
              take: 1,
            },
          },
        })
      : await prisma.product.findMany({
          ...baseArgs,
          select: { id: true, name: true, price: true, stock: true, status: true, images: true },
        })

    const list = Array.isArray(products)
      ? products.map((p: any) => ({
          id: p.id,
          name: (p.translations?.[0]?.name as string) ?? p.name,
          price: p.price,
          stock: p.stock,
          status: p.status,
          image: (() => {
            try {
              const arr = JSON.parse(p.images || '[]')
              if (Array.isArray(arr) && arr.length > 0) return arr[0]
            } catch {}
            return '/images/placeholder.jpg'
          })(),
        }))
      : []

    return NextResponse.json({ items: list, count: list.length })
  } catch (error) {
    console.error('[ADMIN_PRODUCTS_LIST] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}