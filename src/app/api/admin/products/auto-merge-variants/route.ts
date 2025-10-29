import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getProductAttributes } from '@/lib/eav'
import { translateToEnglish } from '@/lib/translate'
import type { Prisma } from '@prisma/client'

// POST /api/admin/products/auto-merge-variants
// Finds products with the same base name in the same category, picks a distinguishing attribute
// (prefer variant_option TEXT, then color/renk SELECT, else first SELECT),
// merges them into a variant group and updates per-locale product names: "<Base Name> - <Label>".
export async function POST(_request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })
    }

    // Load active products with basic fields
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        categoryId: true,
        images: true,
        price: true,
        stock: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group by categoryId + normalized base name (trim spaces)
    const byGroup: Record<string, { id: string; name: string; categoryId: string; createdAt: Date }[]> = {}
    for (const p of products) {
      const baseName = String(p.name || '').trim()
      const key = `${p.categoryId}|${baseName.toLowerCase()}`
      if (!byGroup[key]) byGroup[key] = []
      byGroup[key].push({ id: p.id, name: baseName, categoryId: p.categoryId, createdAt: p.createdAt })
    }

    let groupsProcessed = 0
    let productsLabeled = 0
    const affectedGroups: Array<{ groupId: string; count: number; baseName: string }> = []

    // Helper: ensure TEXT attribute 'variant_option' exists
    async function ensureVariantOptionAttribute(categoryId: string, tx: Prisma.TransactionClient) {
      let attr = await tx.attribute.findFirst({ where: { categoryId, key: 'variant_option' } })
      if (!attr) {
        attr = await tx.attribute.create({ data: { categoryId, key: 'variant_option', type: 'TEXT', isRequired: false, active: true } })
      }
      return attr
    }

    for (const [key, items] of Object.entries(byGroup)) {
      if (items.length < 2) continue // not a variant group
      const categoryId = items[0].categoryId
      const baseName = items[0].name

      // Determine labels per product (TR + EN)
      const labels: Record<string, { tr: string | null; en: string | null }> = {}
      for (const it of items) {
        let labelTr: string | null = null
        let labelEn: string | null = null
        try {
          const attrsTr = await getProductAttributes(it.id, 'tr')
          const attrsEn = await getProductAttributes(it.id, 'en')

          const pickLabel = (attrs: Array<{ key?: string; type?: any; value?: any; name?: string }>): string | null => {
            if (!Array.isArray(attrs)) return null
            const variantText = attrs.find(a => String(a.key || '').toLowerCase() === 'variant_option')
            if (variantText && typeof variantText.value === 'string' && variantText.value.trim()) return variantText.value.trim()
            const colorAttr = attrs.find(a => {
              const k = String(a.key || '').toLowerCase()
              return k === 'color' || k === 'renk'
            })
            const selectAttr = colorAttr || attrs.find(a => String(a.type || '').toUpperCase() === 'SELECT')
            if (selectAttr) {
              const v = selectAttr.value
              if (typeof v === 'string' && v.trim()) return v.trim()
              if (typeof v === 'number') return String(v)
            }
            return null
          }

          labelTr = pickLabel(attrsTr)
          labelEn = pickLabel(attrsEn)

          if (!labelEn && labelTr) {
            // translate TR→EN when needed
            labelEn = await translateToEnglish(labelTr)
          }
        } catch {
          // ignore per-product label errors
        }
        labels[it.id] = { tr: labelTr, en: labelEn }
      }

      // Check if we have at least two distinct TR labels; otherwise skip grouping
      const distinct = Array.from(new Set(items.map(it => (labels[it.id]?.tr || '').toLowerCase()).filter(Boolean)))
      if (distinct.length < 2) continue

      // Determine primary product: earliest createdAt
      const primary = items.reduce((acc, cur) => (acc.createdAt <= cur.createdAt ? acc : cur))
      const variantIds = items.map(it => it.id).filter(id => id !== primary.id)

      await prisma.$transaction(async (tx) => {
        // Set variantGroupId for primary (if not already) and others
        const primaryRow = await tx.product.findUnique({ where: { id: primary.id }, select: { variantGroupId: true } })
        const groupId = primaryRow?.variantGroupId || primary.id
        if (!primaryRow?.variantGroupId) {
          await tx.product.update({ where: { id: primary.id }, data: { variantGroupId: groupId } })
        }
        if (variantIds.length) {
          await tx.product.updateMany({ where: { id: { in: variantIds } }, data: { variantGroupId: groupId } })
        }

        // Ensure TEXT attribute exists for optional label persistence
        const variantAttr = await ensureVariantOptionAttribute(categoryId, tx)

        // Update per-locale product names and persist variant_option TEXT
        for (const it of items) {
          const l = labels[it.id]
          if (!l?.tr) continue
          const labelTr = l.tr
          const labelEn = l.en || l.tr

          // Persist variant_option TEXT value
          await tx.productAttributeValue.upsert({
            where: { productId_attributeId: { productId: it.id, attributeId: variantAttr.id } },
            create: { productId: it.id, attributeId: variantAttr.id, valueText: labelTr },
            update: { valueText: labelTr },
          })

          // Get existing translations for tr/en to build base names
          const existingTranslations = await tx.productTranslation.findMany({ where: { productId: it.id, locale: { in: ['tr', 'en'] } } })
          const trExisting = existingTranslations.find(t => t.locale === 'tr')
          const enExisting = existingTranslations.find(t => t.locale === 'en')
          const baseTr = (trExisting?.name || it.name || baseName).trim()
          const baseEn = (enExisting?.name || it.name || baseName).trim()

          const newTr = `${baseName} - ${labelTr}`
          const newEn = `${baseName} - ${labelEn}`

          // Upsert translations
          await tx.productTranslation.upsert({
            where: { productId_locale: { productId: it.id, locale: 'tr' } },
            create: { productId: it.id, locale: 'tr', name: newTr, description: trExisting?.description || '' },
            update: { name: newTr },
          })
          await tx.productTranslation.upsert({
            where: { productId_locale: { productId: it.id, locale: 'en' } },
            create: { productId: it.id, locale: 'en', name: newEn, description: enExisting?.description || '' },
            update: { name: newEn },
          })

          productsLabeled += 1
        }

        affectedGroups.push({ groupId: primary.id, count: items.length, baseName })
      })

      groupsProcessed += 1
    }

    return NextResponse.json({ success: true, groupsProcessed, productsLabeled, affectedGroups })
  } catch (error) {
    console.error('[ADMIN_AUTO_MERGE_VARIANTS] Error:', error)
    return NextResponse.json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}