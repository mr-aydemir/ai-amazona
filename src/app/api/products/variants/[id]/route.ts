import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { pickTranslatedName } from '@/lib/eav'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const locale = searchParams.get('locale') || 'tr'

    if (!id) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, variantGroupId: true, categoryId: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const groupId = product.variantGroupId
    if (!groupId) {
      return NextResponse.json({ label: null, variants: [] })
    }

    const siblings = await prisma.product.findMany({
      where: { variantGroupId: groupId, status: 'ACTIVE' },
      include: {
        translations: { where: { OR: [{ locale }, { locale: { startsWith: locale } }] } },
      },
      orderBy: { createdAt: 'asc' },
    })
    const productIds = siblings.map(s => s.id)
    const base = String(locale).split('-')[0]
    const primary = await prisma.product.findUnique({ where: { id: groupId }, select: { variantAttributeId: true } })
    let multiDims: Array<{ attributeId: string; attribute: any }> = []
    try {
      const rows = await prisma.productVariantAttribute.findMany({ where: { productId: groupId }, include: { attribute: { include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } } } })
      multiDims = rows as any
    } catch {
      multiDims = []
    }
    const optionMap: Record<string, { optionLabel: string | null; attrName?: string | null }> = {}
    let groupLabel: string | null = null

    if (primary?.variantAttributeId || (multiDims && multiDims.length > 0)) {
      const selectedAttrIds = multiDims.length > 0 ? multiDims.map(d => d.attributeId) : [primary!.variantAttributeId!]
      const selectedAttrs = multiDims.length > 0 ? multiDims.map(d => d.attribute) : []
      const isMulti = selectedAttrIds.length > 1
      const pavs = await prisma.productAttributeValue.findMany({
        where: { productId: { in: productIds }, attributeId: { in: selectedAttrIds } },
        include: { option: { include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } } },
      })
      const valuesByProduct: Record<string, Record<string, string | null>> = {}
      for (const row of pavs) {
        const pid = row.productId
        const aid = row.attributeId
        const val = row.option ? (pickTranslatedName((row.option.translations || []) as any, locale) || (row.option as any).key || null) : ((row.valueText || '').trim() || null)
        if (!valuesByProduct[pid]) valuesByProduct[pid] = {}
        valuesByProduct[pid][aid] = typeof val === 'string' ? val : (typeof val === 'number' ? String(val) : null)
      }
      for (const pid of productIds) {
        const perAttr = valuesByProduct[pid] || {}
        if (!isMulti) {
          const aid = selectedAttrIds[0]
          const label = perAttr[aid] || null
          const attrName = selectedAttrs[0] ? (pickTranslatedName((selectedAttrs[0].translations || []) as any, locale) || (selectedAttrs[0] as any).key) : null
          optionMap[pid] = { optionLabel: label, attrName }
        } else {
          const parts: string[] = []
          for (const aid of selectedAttrIds) {
            const attr = selectedAttrs.find(a => (a as any).id === aid)
            const an = attr ? (pickTranslatedName((attr.translations || []) as any, locale) || (attr as any).key) : ''
            const vl = perAttr[aid] || null
            if (an && vl) parts.push(`${an}: ${vl}`)
          }
          const label = parts.length ? parts.join(' | ') : null
          optionMap[pid] = { optionLabel: label, attrName: parts.length ? (base === 'tr' ? 'Varyant' : 'Variant') : null }
        }
      }
      groupLabel = isMulti
        ? (base === 'tr' ? 'Varyantlar' : 'Variants')
        : (selectedAttrs[0] ? (pickTranslatedName((selectedAttrs[0].translations || []) as any, locale) || (selectedAttrs[0] as any).key) : groupLabel)
    } else {
      const selectRows = await prisma.productAttributeValue.findMany({
        where: { productId: { in: productIds }, attribute: { active: true, type: 'SELECT' } },
        include: {
          attribute: { include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } },
          option: { include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } },
        },
        orderBy: [{ attribute: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
      })
      const textRows = await prisma.productAttributeValue.findMany({
        where: { productId: { in: productIds }, attribute: { active: true, type: 'TEXT', key: 'variant_option' } },
        include: { attribute: { include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } } },
        orderBy: [{ attribute: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
      })
      for (const row of selectRows) {
        const pid = row.productId
        const key = String((row as any).attribute.key || '').toLowerCase()
        const val = pickTranslatedName(((row as any).option?.translations || []) as any, locale) || ((row as any).option?.key) || null
        const attrName = pickTranslatedName(((row as any).attribute.translations || []) as any, locale) || (row as any).attribute.key
        const existing = optionMap[pid]
        if (key === 'color' || key === 'renk') {
          optionMap[pid] = { optionLabel: typeof val === 'string' ? val : (typeof val === 'number' ? String(val) : null), attrName }
        } else if (!existing) {
          optionMap[pid] = { optionLabel: typeof val === 'string' ? val : (typeof val === 'number' ? String(val) : null), attrName }
        }
      }
      for (const row of textRows) {
        const pid = row.productId
        if (!optionMap[pid]) {
          const raw = (row.valueText || '').trim()
          const attrName = pickTranslatedName(((row as any).attribute.translations || []) as any, locale) || (row as any).attribute.key
          optionMap[pid] = { optionLabel: raw || null, attrName }
        }
      }
      const firstPid = productIds.find(pid => optionMap[pid]?.optionLabel)
      if (firstPid) {
        const nm = optionMap[firstPid]?.attrName || null
        groupLabel = nm || (base === 'tr' ? 'Varyant' : 'Variant')
      }
    }

    // Build response items without per-variant attribute queries
    const variantItems = await Promise.all(siblings.map(async (p) => {
      let images: string[] = []
      try {
        images = Array.isArray((p as any).images) ? (p as any).images : JSON.parse((p as any).images || '[]')
      } catch { images = [] }

      // Use database translations directly - no runtime translation needed
      const translatedName = p.translations?.[0]?.name || undefined
      const nameOut = translatedName || (p as any).name

      // Use pre-translated option labels from database
      const optionLabel = optionMap[p.id]?.optionLabel || null
      let attributes: Array<{ attrId: string; attrName: string; label: string }> = []
      if (primary?.variantAttributeId || (multiDims && multiDims.length > 0)) {
        const selectedAttrIds = multiDims.length > 0 ? multiDims.map(d => d.attributeId) : [primary!.variantAttributeId!]
        const selectedAttrs = multiDims.length > 0 ? multiDims.map(d => d.attribute) : []
        const list: Array<{ attrId: string; attrName: string; label: string }> = []
        for (let i = 0; i < selectedAttrIds.length; i++) {
          const aid = selectedAttrIds[i]
          const attr = selectedAttrs[i]
          const attrName = attr ? (pickTranslatedName((attr.translations || []) as any, locale) || (attr as any).key) : null
          const pav = await prisma.productAttributeValue.findFirst({ where: { productId: p.id, attributeId: aid }, include: { option: { include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } } } })
          const label = pav?.option ? (pickTranslatedName((pav.option.translations || []) as any, locale) || (pav.option as any).key || '') : ((pav?.valueText || '').trim())
          if (attrName && label) list.push({ attrId: aid, attrName, label })
        }
        attributes = list
      }

      return {
        id: p.id,
        name: nameOut,
        images,
        price: (p as any).price,
        stock: (p as any).stock,
        optionLabel,
        attributes,
      }
    }))

    // Build variantDimensions (options per selected attribute)
    let variantDimensions: Array<{ id: string; name: string; type: 'SELECT' | 'TEXT'; options: Array<{ label: string }> }> = []
    if (multiDims && multiDims.length > 0) {
      for (const d of multiDims) {
        const aid = d.attributeId
        const aname = pickTranslatedName((d.attribute.translations || []) as any, locale) || (d.attribute as any).key
        const rows = await prisma.productAttributeValue.findMany({
          where: { productId: { in: productIds }, attributeId: aid },
          include: { option: { include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } } },
        })
        const labels = new Set<string>()
        for (const r of rows) {
          const val = r.option ? (pickTranslatedName((r.option.translations || []) as any, locale) || (r.option as any).key || null) : ((r.valueText || '').trim() || null)
          if (typeof val === 'string' && val.trim()) labels.add(val.trim())
        }
        variantDimensions.push({ id: aid, name: aname, type: (d.attribute as any).type, options: Array.from(labels).map(l => ({ label: l })) })
      }
    } else if (primary?.variantAttributeId) {
      const attr = await prisma.attribute.findUnique({ where: { id: primary.variantAttributeId }, include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } })
      if (attr) {
        const rows = await prisma.productAttributeValue.findMany({ where: { productId: { in: productIds }, attributeId: attr.id }, include: { option: { include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } } } })
        const labels = new Set<string>()
        for (const r of rows) {
          const val = r.option ? (pickTranslatedName((r.option.translations || []) as any, locale) || (r.option as any).key || null) : ((r.valueText || '').trim() || null)
          if (typeof val === 'string' && val.trim()) labels.add(val.trim())
        }
        const aname = pickTranslatedName((attr.translations || []) as any, locale) || (attr as any).key
        variantDimensions.push({ id: attr.id, name: aname, type: (attr as any).type, options: Array.from(labels).map(l => ({ label: l })) })
      }
    }

    return NextResponse.json({ label: groupLabel, variants: variantItems, variantDimensions })
  } catch (error) {
    console.error('[PRODUCT_VARIANTS_API] Failed to fetch variants:', error)
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 })
  }
}
