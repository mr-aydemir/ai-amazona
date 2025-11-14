import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { uniqueSlug } from '@/lib/slugify'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/products/[id]/variants/add
// Klon mantığı: Primary ürün yoksa 404; groupId = primary.variantGroupId || primary.id
// Primary’nin groupId’si yoksa set edilir; sonra aynı alanlarla yeni ürün oluşturulur ve gruba eklenir
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Ürün ID\'si gereklidir' }, { status: 400 })
    }

    const primary = await prisma.product.findUnique({
      where: { id },
      include: { translations: true }
    })

    if (!primary) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    const groupId = primary.variantGroupId || primary.id

    const created = await prisma.$transaction(async (tx) => {
      // Primary ürünün groupId'si yoksa set et
      if (!primary.variantGroupId) {
        await tx.product.update({ where: { id: primary.id }, data: { variantGroupId: groupId } })
      }

      // Mevcut grup üye sayısına göre sıradaki numarayı belirle
      const existingCount = await tx.product.count({ where: { variantGroupId: groupId } })
      const nextIndex = existingCount + 1

      // Yeni slug üret
      const baseSlug = `${primary.slug || primary.name}-variant-${nextIndex}`
      const newSlug = await uniqueSlug(baseSlug, async (candidate) => {
        const count = await tx.product.count({ where: { slug: candidate } })
        return count > 0
      })

      // Ürünü klonla
      const newProduct = await tx.product.create({
        data: {
          name: `${primary.name} ${nextIndex}`,
          description: primary.description,
          price: primary.price,
          stock: primary.stock,
          categoryId: primary.categoryId,
          images: primary.images,
          status: primary.status as any,
          slug: newSlug,
          variantGroupId: groupId,
          translations: {
            create: await Promise.all((primary.translations || []).map(async (tr) => {
              const trBase = `${tr.slug || tr.name}-variant-${nextIndex}`
              const trSlug = await uniqueSlug(trBase, async (candidate) => {
                const count = await tx.productTranslation.count({ where: { locale: tr.locale, slug: candidate } })
                return count > 0
              })
              return {
                locale: tr.locale,
                name: `${tr.name} ${nextIndex}`,
                description: tr.description,
                slug: trSlug,
              }
            }))
          }
        },
        select: { id: true, name: true, slug: true, variantGroupId: true }
      })

      return newProduct
    })

    return NextResponse.json({ success: true, variant: created })
  } catch (error) {
    console.error('[ADMIN_ADD_VARIANT] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}