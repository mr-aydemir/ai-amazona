import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getProductAttributes } from '@/lib/eav'
import { translateToEnglish } from '@/lib/translate'

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

    // Determine attribute to use for label: prefer custom TEXT 'variant_option', then 'color'/'renk' SELECT, fallback to first SELECT
    let groupLabel: string | null = null
    const variantItems = [] as Array<{ id: string; name: string; images: string[]; price: number; stock: number; optionLabel?: string | null }>
    for (const p of siblings) {
      let images: string[] = []
      try {
        images = Array.isArray((p as any).images) ? (p as any).images : JSON.parse((p as any).images || '[]')
      } catch { images = [] }

      let optionLabel: string | null = null
      try {
        const attrs = await getProductAttributes(p.id, locale)
        // Prefer SELECT (translated) for option label
        const colorAttr = attrs.find(a => {
          const k = String(a.key || '').toLowerCase()
          return k === 'color' || k === 'renk'
        })
        const selectAttr = colorAttr || attrs.find(a => String(a.type || '').toUpperCase() === 'SELECT')
        if (selectAttr) {
          // Group label: enforce language-specific default to avoid TR keys leaking into EN
          groupLabel = groupLabel || (String(locale).split('-')[0] === 'tr' ? 'Varyant' : 'Variant')
          optionLabel = typeof selectAttr.value === 'string' ? selectAttr.value : (typeof selectAttr.value === 'number' ? String(selectAttr.value) : null)
          // If locale is EN, translate SELECT value when no EN translation exists
          if (String(locale).split('-')[0] === 'en' && typeof optionLabel === 'string' && optionLabel.trim()) {
            try {
              const translated = await translateToEnglish(optionLabel)
              optionLabel = translated || optionLabel
            } catch { }
          }
        } else {
          // Fallback to TEXT 'variant_option'; translate to EN if needed
          const customText = attrs.find(a => String(a.key || '').toLowerCase() === 'variant_option')
          if (customText && typeof customText.value === 'string' && customText.value.trim()) {
            groupLabel = groupLabel || (customText.name || (locale?.startsWith('tr') ? 'Seçenek' : 'Option'))
            const raw = customText.value.trim()
            optionLabel = raw
            if (String(locale).split('-')[0] === 'en') {
              try {
                const translated = await translateToEnglish(raw)
                optionLabel = translated || raw
              } catch { }
            }
          }
        }
      } catch { }

      const translatedName = p.translations?.[0]?.name || undefined
      let nameOut = translatedName || (p as any).name
      // If locale is EN and name looks Turkish or translation missing, auto-translate name
      if (String(locale).split('-')[0] === 'en') {
        const trChars = /[ğĞşŞçÇıİöÖüÜ]/
        if (!translatedName || trChars.test(String(nameOut || ''))) {
          try {
            const translated = await translateToEnglish(String(nameOut || ''))
            nameOut = translated || nameOut
          } catch { /* ignore translation failures */ }
        }
      }
      variantItems.push({
        id: p.id,
        name: nameOut,
        images,
        price: (p as any).price,
        stock: (p as any).stock,
        optionLabel,
      })
    }

    return NextResponse.json({ label: groupLabel, variants: variantItems })
  } catch (error) {
    console.error('[PRODUCT_VARIANTS_API] Failed to fetch variants:', error)
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 })
  }
}