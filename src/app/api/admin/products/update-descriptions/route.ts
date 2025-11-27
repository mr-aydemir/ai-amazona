import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { translateToEnglish } from '@/lib/translate'

type TrendyolProduct = {
  id?: string | number
  productId?: string | number
  productMainId?: string | number
  description?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })
    }

    const body = await request.json()
    const products: TrendyolProduct[] = Array.isArray(body?.products) ? body.products : []
    let updated = 0
    let skipped = 0

    for (const p of products) {
      try {
        const productId = String(p.id ?? p.productId ?? p.productMainId ?? '')
        if (!productId) continue
        const raw = String(p.description ?? '').trim()
        const formatted = raw ? raw.replace(/;\s*/g, '\n\n') : ''
        const existing = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
        if (!existing) { skipped += 1; continue }

        await prisma.product.update({ where: { id: productId }, data: { description: formatted } })

        const trRow = await prisma.productTranslation.findUnique({ where: { productId_locale: { productId, locale: 'tr' } }, select: { slug: true } })
        const trSlug = trRow?.slug || null
        await prisma.productTranslation.upsert({
          where: { productId_locale: { productId, locale: 'tr' } },
          update: { description: formatted },
          create: { productId, locale: 'tr', name: '', description: formatted, slug: trSlug || undefined },
        })

        const enText = formatted ? await translateToEnglish(formatted) : ''
        const enRow = await prisma.productTranslation.findUnique({ where: { productId_locale: { productId, locale: 'en' } }, select: { slug: true } })
        const enSlug = enRow?.slug || null
        await prisma.productTranslation.upsert({
          where: { productId_locale: { productId, locale: 'en' } },
          update: { description: enText },
          create: { productId, locale: 'en', name: '', description: enText, slug: enSlug || undefined },
        })

        updated += 1
      } catch (err) {
        skipped += 1
      }
    }

    return NextResponse.json({ message: 'Detay güncelleme tamamlandı', updated, skipped, total: products.length })
  } catch (error) {
    return NextResponse.json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}

