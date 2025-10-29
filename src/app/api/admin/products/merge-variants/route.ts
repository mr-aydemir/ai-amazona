import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// POST /api/admin/products/merge-variants
// Body: { primaryProductId: string, variantProductIds: string[] }
// Ensures all specified products share the same variantGroupId
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
    const primaryProductId: string | undefined = body?.primaryProductId
    const variantProductIds: string[] = Array.isArray(body?.variantProductIds) ? body.variantProductIds.filter(Boolean) : []
    const variantLabels: Record<string, string> = typeof body?.variantLabels === 'object' && body?.variantLabels !== null ? body.variantLabels : {}

    if (!primaryProductId || variantProductIds.length === 0) {
      return NextResponse.json({ error: 'primaryProductId ve en az bir variantProductIds gereklidir' }, { status: 400 })
    }

    // Ensure unique set and exclude primary if included
    const uniqueIds = Array.from(new Set(variantProductIds.filter((id) => id !== primaryProductId)))
    if (uniqueIds.length === 0) {
      return NextResponse.json({ error: 'Birleştirilecek ürün bulunamadı' }, { status: 400 })
    }

    // Verify all products exist
    const allIds = [primaryProductId, ...uniqueIds]
    const products = await prisma.product.findMany({ where: { id: { in: allIds } }, select: { id: true, variantGroupId: true, categoryId: true } })
    if (products.length !== allIds.length) {
      return NextResponse.json({ error: 'Bazı ürünler bulunamadı' }, { status: 404 })
    }

    // Determine the group id to use
    const primary = products.find((p) => p.id === primaryProductId)!
    const groupId = primary.variantGroupId || primaryProductId

    // Update primary if needed, then others
    await prisma.$transaction(async (tx) => {
      if (!primary.variantGroupId) {
        await tx.product.update({ where: { id: primaryProductId }, data: { variantGroupId: groupId } })
      }
      await tx.product.updateMany({ where: { id: { in: uniqueIds } }, data: { variantGroupId: groupId } })

      // Persist variant option labels if provided
      const allForLabel = [primaryProductId, ...uniqueIds]
      for (const pid of allForLabel) {
        const labelRaw = variantLabels[pid]
        const label = typeof labelRaw === 'string' ? labelRaw.trim() : ''
        if (!label) continue
        const p = products.find((pp) => pp.id === pid)
        if (!p?.categoryId) continue
        // Find or create the TEXT attribute 'variant_option' in this category
        let attr = await tx.attribute.findFirst({ where: { categoryId: p.categoryId, key: 'variant_option' } })
        if (!attr) {
          attr = await tx.attribute.create({ data: { categoryId: p.categoryId, key: 'variant_option', type: 'TEXT', isRequired: false, active: true } })
        }
        // Upsert product attribute value
        await tx.productAttributeValue.upsert({
          where: { productId_attributeId: { productId: pid, attributeId: attr.id } },
          create: { productId: pid, attributeId: attr.id, valueText: label },
          update: { valueText: label },
        })
      }
    })

    // Return the merged group variants list
    const siblings = await prisma.product.findMany({
      where: { variantGroupId: groupId },
      select: { id: true, name: true, price: true, stock: true, images: true },
      orderBy: { createdAt: 'asc' },
    })
    const variants = siblings.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      images: (() => { try { const arr = JSON.parse(p.images || '[]'); return Array.isArray(arr) ? arr : [] } catch { return [] } })(),
    }))

    return NextResponse.json({ success: true, groupId, variants })
  } catch (error) {
    console.error('[ADMIN_MERGE_VARIANTS] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}