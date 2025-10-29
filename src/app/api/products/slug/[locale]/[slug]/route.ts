import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getProductAttributes, pickTranslatedName } from '@/lib/eav'
import { translateToEnglish } from '@/lib/translate'

interface RouteParams {
  params: Promise<{ locale: string; slug: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { locale, slug } = await params
    if (!locale || !slug) {
      return NextResponse.json(
        { error: 'Locale ve slug parametreleri gereklidir' },
        { status: 400 }
      )
    }

    // Prefer translation-based slug per locale (exact or base match)
    const t = await prisma.productTranslation.findFirst({ where: { slug, OR: [{ locale }, { locale: { startsWith: locale } }] } })
    let id = t?.productId
    // Fallback: legacy global product.slug
    if (!id) {
      const p = await prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true } })
      id = p?.id
    }
    // Fallback: treat slug as direct product id (backward compatibility)
    if (!id) {
      const p2 = await prisma.product.findFirst({ where: { id: slug, status: 'ACTIVE' }, select: { id: true } })
      id = p2?.id
    }
    if (!id) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    // Fetch product with translations for the specific locale (exact or base)
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            translations: { where: { OR: [{ locale }, { locale: { startsWith: locale } }] } }
          }
        },
        translations: { where: { OR: [{ locale }, { locale: { startsWith: locale } }] } },
        reviews: {
          include: {
            user: { select: { name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    const translationName = pickTranslatedName(product.translations as any, locale)
    const translationDesc = (() => {
      const exact = product.translations.find((t: any) => t.locale === locale)?.description
      if (exact) return exact
      const base = String(locale).split('-')[0]
      const baseMatch = product.translations.find((t: any) => t.locale === base)?.description
      return baseMatch
    })()
    const categoryName = pickTranslatedName(product.category.translations as any, locale)

    const parsedImages = Array.isArray(product.images)
      ? (product.images as any)
      : (() => { try { return JSON.parse(product.images || '[]') } catch { return [] } })()

    // Pull EAV attributes for this product
    const attributes = await getProductAttributes(id, locale)

    // Determine output name/description with locale-aware fallbacks
    let nameOut = translationName || (product as any).name
    let descOut = translationDesc || (product as any).description

    // If EN locale and no translation or Turkish-looking text, auto-translate
    if (String(locale || '').split('-')[0] === 'en') {
      const trChars = /[ğĞşŞçÇıİöÖüÜ]/
      const looksTurkish = trChars.test(nameOut || '') || trChars.test(descOut || '')
      const identical = (nameOut || '').trim() === ((product as any).name || '').trim() && (descOut || '').trim() === ((product as any).description || '').trim()
      if (looksTurkish || identical) {
        try {
          nameOut = await translateToEnglish((product as any).name)
          descOut = await translateToEnglish((product as any).description)
        } catch {
          // keep existing values on failure
        }
      }
    }

    // Prefer translation-based slug for current locale (exact or base), fallback to legacy
    const exactTr = (product as any).translations?.find?.((t: any) => t.locale === locale)
    const baseLoc = String(locale || '').split('-')[0]
    const baseTr = (product as any).translations?.find?.((t: any) => t.locale === baseLoc)
    const slugOut = (exactTr?.slug || baseTr?.slug || (product as any).slug || String(id))

    return NextResponse.json({
      ...product,
      slug: slugOut,
      name: nameOut,
      description: descOut,
      images: parsedImages,
      category: {
        ...product.category,
        name: categoryName || product.category.name,
      },
      attributes,
    })
  } catch (error) {
    console.error('Product by slug fetch error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}