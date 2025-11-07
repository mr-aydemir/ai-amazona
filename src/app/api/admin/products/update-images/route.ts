import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

type TrendyolImage = { url?: string }
type TrendyolProduct = {
  id?: string | number
  productId?: string | number
  productMainId?: string | number
  images?: TrendyolImage[]
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

    const placeholderImage = '/images/placeholder.jpg'

    for (const p of products) {
      try {
        const productId = String(p.id ?? p.productId ?? p.productMainId ?? '')
        if (!productId) continue

        const imagesArray = (p.images ?? [])
          .map((img) => img?.url)
          .filter((url): url is string => !!url)
        const imagesJson = JSON.stringify(imagesArray.length > 0 ? imagesArray : [placeholderImage])

        const existing = await prisma.product.findUnique({ where: { id: productId } })
        if (existing) {
          await prisma.product.update({
            where: { id: productId },
            data: {
              images: imagesJson,
            },
          })
          updated += 1
        } else {
          skipped += 1
        }
      } catch (err) {
        console.error('Update images item error:', err)
      }
    }

    return NextResponse.json({ message: 'Resim güncelleme tamamlandı', updated, skipped, total: products.length })
  } catch (error) {
    console.error('Update images error:', error)
    return NextResponse.json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}