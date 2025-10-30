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
    // Batch-fetch SELECT and TEXT('variant_option') attributes for all sibling products
    const productIds = siblings.map(s => s.id)
    const base = String(locale).split('-')[0]
    const selectRows = await prisma.productAttributeValue.findMany({
      where: {
        productId: { in: productIds },
        attribute: { active: true, type: 'SELECT' },
      },
      include: {
        attribute: { include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } },
        option: { include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } },
      },
      orderBy: [
        { attribute: { sortOrder: 'asc' } },
        { createdAt: 'asc' },
      ],
    })

    const textRows = await prisma.productAttributeValue.findMany({
      where: {
        productId: { in: productIds },
        attribute: { active: true, type: 'TEXT', key: 'variant_option' },
      },
      include: {
        attribute: { include: { translations: { where: { OR: [{ locale }, { locale: base }] } } } },
      },
      orderBy: [
        { attribute: { sortOrder: 'asc' } },
        { createdAt: 'asc' },
      ],
    })

    // Build a label map per product: prefer color/renk SELECT, else first SELECT, else TEXT variant_option
    const optionMap: Record<string, { optionLabel: string | null; attrName?: string | null }> = {}
    for (const row of selectRows) {
      const pid = row.productId
      const key = String(row.attribute.key || '').toLowerCase()
      const val = pickTranslatedName((row.option?.translations || []) as any, locale) || row.option?.key || null
      const attrName = pickTranslatedName((row.attribute.translations || []) as any, locale) || row.attribute.key
      // Prefer color/renk; if already set with non-color, replace when color appears
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
        const attrName = pickTranslatedName((row.attribute.translations || []) as any, locale) || row.attribute.key
        optionMap[pid] = { optionLabel: raw || null, attrName }
      }
    }

    // Decide group label from first available attribute name or fallback generic
    let groupLabel: string | null = null
    const firstPid = productIds.find(pid => optionMap[pid]?.optionLabel)
    if (firstPid) {
      const nm = optionMap[firstPid]?.attrName || null
      groupLabel = nm || (base === 'tr' ? 'Varyant' : 'Variant')
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

      return {
        id: p.id,
        name: nameOut,
        images,
        price: (p as any).price,
        stock: (p as any).stock,
        optionLabel,
      }
    }))

    return NextResponse.json({ label: groupLabel, variants: variantItems })
  } catch (error) {
    console.error('[PRODUCT_VARIANTS_API] Failed to fetch variants:', error)
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 })
  }
}