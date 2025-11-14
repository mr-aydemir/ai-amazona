import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const { id } = await params
    const primaryProduct = await prisma.product.findUnique({
      where: { id },
    })

    if (!primaryProduct) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    let variants = [primaryProduct]

    if (primaryProduct.variantGroupId) {
      const otherVariants = await prisma.product.findMany({
        where: {
          variantGroupId: primaryProduct.variantGroupId,
          NOT: {
            id: primaryProduct.id,
          },
        },
      })
      variants = [...variants, ...otherVariants]
    }

    let variantDims: Array<{ attributeId: string; sortOrder?: number }> = []
    try {
      const rows = await prisma.productVariantAttribute.findMany({
        where: { productId: primaryProduct.variantGroupId || primaryProduct.id },
        select: { attributeId: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      })
      variantDims = rows
    } catch {
      variantDims = []
    }
    return NextResponse.json({
      variants,
      variantAttributeId: primaryProduct.variantAttributeId || null,
      variantAttributeIds: variantDims.map(d => d.attributeId),
    })
  } catch (error) {
    console.error('Varyantlar getirilirken hata:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const body = await request.json()
    const variants = Array.isArray(body?.variants) ? (body.variants as Array<any>) : []
    const variantAttributeId = body?.variantAttributeId as string | undefined
    const variantAttributeIds = Array.isArray(body?.variantAttributeIds) ? (body.variantAttributeIds as string[]) : []

    // If only dimension selection is being updated, allow empty variants and persist selection
    if (variantAttributeIds.length > 0 && variants.length === 0) {
      const { id: primaryId } = await params
      try {
        await prisma.$transaction(async (tx) => {
          const groupPrimaryId = primaryId
          await tx.productVariantAttribute.deleteMany({ where: { productId: groupPrimaryId } })
          for (let i = 0; i < variantAttributeIds.length; i++) {
            const aid = variantAttributeIds[i]
            if (typeof aid === 'string' && aid.trim()) {
              const attr = await tx.attribute.findUnique({ where: { id: aid } })
              if (attr) {
                await tx.productVariantAttribute.create({ data: { productId: groupPrimaryId, attributeId: aid, sortOrder: i } })
              }
            }
          }
          if (variantAttributeIds.length === 1) {
            await tx.product.update({ where: { id: groupPrimaryId }, data: { variantAttributeId: variantAttributeIds[0] } })
          }
        })
        return NextResponse.json({ success: true })
      } catch (e) {
        console.error('Varyant boyutları güncellenemedi:', e)
        return NextResponse.json({ error: 'Seçim kaydedilemedi' }, { status: 500 })
      }
    }

    // Fetch products to get categoryId for each variant
    const productIds = variants
      .map((v: any) => (v && typeof v.id === 'string' ? v.id : null))
      .filter(Boolean) as string[]

    if (productIds.length === 0) {
      // No variant payload; if no dimensions either, it's a bad request
      if (variantAttributeIds.length === 0) {
        return NextResponse.json({ error: 'Geçerli ürün bulunamadı' }, { status: 400 })
      }
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true },
    })

    // Map productId -> categoryId
    const productCategoryMap = new Map<string, string>()
    for (const p of products) {
      if (p.categoryId) productCategoryMap.set(p.id, p.categoryId)
    }

    // Transaction: optionally set variantAttributeId, ensure attribute exists per category when needed, then upsert ProductAttributeValue
    const { id: primaryId } = await params
    await prisma.$transaction(async (tx) => {
      // Cache for found/created attributes per category
      const attrIdByCategory = new Map<string, string>()

      // Helper to get or create variant_option TEXT attribute for a category
      const ensureVariantAttr = async (categoryId: string): Promise<string> => {
        const cached = attrIdByCategory.get(categoryId)
        if (cached) return cached
        let attr = await tx.attribute.findFirst({ where: { categoryId, key: 'variant_option' } })
        if (!attr) {
          attr = await tx.attribute.create({
            data: { categoryId, key: 'variant_option', type: 'TEXT', isRequired: false, active: true },
          })
        }
        attrIdByCategory.set(categoryId, attr.id)
        return attr.id
      }

      // If variantAttributeId provided, set it on primary product (legacy single-dimension)
      if (typeof variantAttributeId === 'string' && variantAttributeId.trim() && primaryId) {
        const attr = await tx.attribute.findUnique({ where: { id: variantAttributeId } })
        if (attr) {
          await tx.product.update({ where: { id: primaryId }, data: { variantAttributeId: variantAttributeId } })
        }
      }

      // If variantAttributeIds provided, set multi-dimensions relations for group primary
      if (Array.isArray(variantAttributeIds) && primaryId) {
        const groupPrimaryId = primaryId
        try {
          await tx.productVariantAttribute.deleteMany({ where: { productId: groupPrimaryId } })
          for (let i = 0; i < variantAttributeIds.length; i++) {
            const aid = variantAttributeIds[i]
            if (typeof aid === 'string' && aid.trim()) {
              const attr = await tx.attribute.findUnique({ where: { id: aid } })
              if (attr) {
                await tx.productVariantAttribute.create({ data: { productId: groupPrimaryId, attributeId: aid, sortOrder: i } })
              }
            }
          }
        } catch {
          // ignore when join table is not available yet
        }
      }

      for (const variant of variants as Array<{ id?: string; value?: string; optionId?: string }>) {
        const pid = variant?.id || ''
        const valRaw = variant?.value || ''
        const valueText = typeof valRaw === 'string' ? valRaw.trim() : ''
        const optionId = typeof variant?.optionId === 'string' ? variant.optionId : undefined
        if (!pid || !valueText) continue
        const categoryId = productCategoryMap.get(pid)
        if (!categoryId) continue
        let targetAttrId = variantAttributeId && variantAttributeId.trim() ? variantAttributeId : await ensureVariantAttr(categoryId)
        const attr = await tx.attribute.findUnique({ where: { id: targetAttrId } })
        if (!attr) {
          targetAttrId = await ensureVariantAttr(categoryId)
        }
        if (attr && attr.type === 'SELECT') {
          let finalOptionId = optionId
          if (!finalOptionId && valueText) {
            const opt = await tx.attributeOption.findFirst({
              where: { attributeId: targetAttrId, translations: { some: { name: valueText } } },
              select: { id: true },
            })
            if (opt) {
              finalOptionId = opt.id
            } else {
              const newOpt = await tx.attributeOption.create({ data: { attributeId: targetAttrId, active: true, sortOrder: 0 } })
              await tx.attributeOptionTranslation.create({
                data: { attributeOptionId: newOpt.id, locale: 'tr', name: valueText },
              })
              finalOptionId = newOpt.id
            }
          }
          if (finalOptionId) {
            await tx.productAttributeValue.upsert({
              where: { productId_attributeId: { productId: pid, attributeId: targetAttrId } },
              create: { productId: pid, attributeId: targetAttrId, attributeOptionId: finalOptionId },
              update: { attributeOptionId: finalOptionId, valueText: null },
            })
            continue
          }
        }
        await tx.productAttributeValue.upsert({
          where: { productId_attributeId: { productId: pid, attributeId: targetAttrId } },
          create: { productId: pid, attributeId: targetAttrId, valueText },
          update: { valueText, attributeOptionId: null },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Varyantlar güncellenirken hata:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
