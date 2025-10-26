import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const type = searchParams.get('type') // 'product' or 'category'
    const excludeId = searchParams.get('excludeId') // ID to exclude (for editing)
    const scope = searchParams.get('scope') || 'global' // 'global' or 'translation'
    const locale = searchParams.get('locale') || undefined

    if (!slug || !type) {
      return NextResponse.json(
        { error: 'Slug ve type parametreleri gerekli' },
        { status: 400 }
      )
    }

    let exists = false

    if (scope === 'translation') {
      if (!locale) {
        return NextResponse.json(
          { error: 'Çeviri slug kontrolü için locale parametresi gerekli' },
          { status: 400 }
        )
      }

      if (type === 'product') {
        const t = await prisma.productTranslation.findFirst({
          where: {
            locale,
            slug,
            ...(excludeId ? { productId: { not: excludeId } } : {})
          }
        })
        exists = !!t
      } else if (type === 'category') {
        const t = await prisma.categoryTranslation.findFirst({
          where: {
            locale,
            slug,
            ...(excludeId ? { categoryId: { not: excludeId } } : {})
          }
        })
        exists = !!t
      } else {
        return NextResponse.json(
          { error: 'Geçersiz type parametresi' },
          { status: 400 }
        )
      }
    } else {
      // Global slug check (legacy product/category tables)
      if (type === 'product') {
        const product = await prisma.product.findFirst({
          where: {
            slug,
            ...(excludeId ? { id: { not: excludeId } } : {})
          }
        })
        exists = !!product
      } else if (type === 'category') {
        const category = await prisma.category.findFirst({
          where: {
            slug,
            ...(excludeId ? { id: { not: excludeId } } : {})
          }
        })
        exists = !!category
      } else {
        return NextResponse.json(
          { error: 'Geçersiz type parametresi' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      available: !exists,
      exists
    })

  } catch (error) {
    console.error('Slug validation error:', error)
    return NextResponse.json(
      { error: 'Slug kontrolü sırasında hata oluştu' },
      { status: 500 }
    )
  }
}