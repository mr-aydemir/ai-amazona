'use server'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { uniqueSlug } from '@/lib/slugify'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })
    }

    const products: Array<{ id: string; name: string; slug?: string | null }> = await (prisma.product as any).findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'asc' },
    })

    let updated = 0
    let skipped = 0

    for (const p of products) {
      const current = (p.slug || '').trim()
      if (current) { skipped++; continue }

      const slug = await uniqueSlug(p.name, async (s) => {
        const exists = await (prisma.product as any).findUnique({ where: { slug: s } })
        return !!exists
      })

      await (prisma.product as any).update({ where: { id: p.id }, data: { slug } })
      updated++
    }

    return NextResponse.json({ message: 'Slug backfill tamamlandı', updated, skipped, total: products.length })
  } catch (error: any) {
    console.error('[ADMIN_PRODUCTS_SLUG_BACKFILL] error:', error)
    return NextResponse.json({ error: 'Sunucu hatası', message: error?.message ?? 'unknown error' }, { status: 500 })
  }
}