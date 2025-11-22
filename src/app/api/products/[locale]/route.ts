import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { translateToEnglish } from '@/lib/translate'
import { getCurrencyData } from '@/lib/server-currency'

interface RouteParams {
  params: Promise<{ locale: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { locale } = await params
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'default'
    const minPrice = parseFloat(searchParams.get('minPrice') || '0')
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999')
    const { baseCurrency, rates } = await getCurrencyData()
    const rateMap = Object.fromEntries(rates.map((r: any) => [r.currency, r.rate])) as Record<string, number>
    const baseRate = rateMap[baseCurrency] ?? 1
    const displayCurrency = (locale || '').startsWith('en') ? 'USD' : baseCurrency
    const displayRate = rateMap[displayCurrency] ?? baseRate
    const ratio = displayRate / baseRate
    let showInclVat = false
    let vatRate = 0
    let enableAttr = true
    try {
      const settings = await prisma.systemSetting.findFirst({ select: { showPricesInclVat: true, vatRate: true, enableAttributeFilters: true } })
      showInclVat = !!settings?.showPricesInclVat
      vatRate = typeof settings?.vatRate === 'number' ? settings!.vatRate : 0
      enableAttr = typeof settings?.enableAttributeFilters === 'boolean' ? !!settings.enableAttributeFilters : true
    } catch {}
    const vatFactor = showInclVat ? (1 + vatRate) : 1
    const minNet = minPrice / (ratio * vatFactor)
    const maxNet = maxPrice / (ratio * vatFactor)
    const noTranslate = (searchParams.get('noTranslate') || '').toLowerCase() === 'true'

    if (!locale) {
      return NextResponse.json(
        { error: 'Locale parametresi gereklidir' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: any = {
      status: 'ACTIVE',
      price: {
        gte: minNet,
        lte: maxNet
      }
    }

    // Collect AND filters to avoid overwriting when multiple filters are present
    const andFilters: any[] = []

    // Attribute-based filters: attr_<attributeId>=value
    const attrParams: Array<{ id: string; raw: string }> = []
    for (const [k, v] of searchParams.entries()) {
      if (k.startsWith('attr_') && typeof v === 'string') {
        attrParams.push({ id: k.substring('attr_'.length), raw: v })
      }
    }
    if (enableAttr && attrParams.length > 0) {
      const attrIds = attrParams.map((p) => p.id)
      const attrDefs = await prisma.attribute.findMany({ where: { id: { in: attrIds } }, select: { id: true, type: true } })
      for (const p of attrParams) {
        const def = attrDefs.find((d) => d.id === p.id)
        if (!def) continue
        const raw = p.raw
        if (def.type === 'SELECT') {
          const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
          andFilters.push({
            attributeValues: {
              some: {
                attributeId: p.id,
                ...(ids.length > 1 ? { attributeOptionId: { in: ids } } : { attributeOptionId: ids[0] || undefined })
              }
            }
          })
        } else if (def.type === 'BOOLEAN') {
          const val = raw.toLowerCase() === 'true' ? true : raw.toLowerCase() === 'false' ? false : undefined
          if (typeof val === 'boolean') {
            andFilters.push({ attributeValues: { some: { attributeId: p.id, valueBoolean: val } } })
          }
        } else if (def.type === 'NUMBER') {
          const num = parseFloat(raw)
          if (!isNaN(num)) {
            andFilters.push({ attributeValues: { some: { attributeId: p.id, valueNumber: num } } })
          }
        } else {
          if (raw && raw.length > 0) {
            andFilters.push({ attributeValues: { some: { attributeId: p.id, valueText: raw } } })
          }
        }
      }
    }

    // Category filter: support both categoryId and category.slug
    if (category && category !== 'all') {
      andFilters.push({
        OR: [
          { categoryId: category },
          { category: { is: { slug: category } } },
          { category: { is: { translations: { some: { locale, slug: category } } } } }
        ]
      })
    }

    // Search filter across product fields and translations
    if (search) {
      andFilters.push({
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            translations: {
              some: {
                OR: [
                  {
                    name: {
                      contains: search,
                      mode: 'insensitive'
                    }
                  },
                  {
                    description: {
                      contains: search,
                      mode: 'insensitive'
                    }
                  }
                ]
              }
            }
          }
        ]
      })
    }

    if (andFilters.length > 0) {
      where.AND = andFilters
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' }

    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' }
        break
      case 'price_desc':
        orderBy = { price: 'desc' }
        break
      case 'name_asc':
        orderBy = { name: 'asc' }
        break
      case 'name_desc':
        orderBy = { name: 'desc' }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    // Varyant gizleme: yalnızca ana ürünleri listelemek için grupları belirle
    // 1) Tüm eşleşen kayıtların id ve variantGroupId alanlarını alıp sıralı grup anahtarları oluştur
    const allForKeys = await prisma.product.findMany({
      where,
      select: { id: true, variantGroupId: true },
      orderBy,
    })

    // Sıralı ve tekrar etmeyen grup anahtarları (variantGroupId || id)
    const orderedGroupKeys: string[] = []
    const seenKeys = new Set<string>()
    for (const row of allForKeys) {
      const key = row.variantGroupId || row.id
      if (!seenKeys.has(key)) {
        seenKeys.add(key)
        orderedGroupKeys.push(key)
      }
    }

    // Çok satanlar sıralaması istenirse, grup anahtarlarını sipariş adetlerine göre yeniden sırala
    if (sort === 'bestsellers') {
      const grouped = await prisma.orderItem.groupBy({ by: ['productId'], _count: { _all: true } })
      const prodToKey = new Map<string, string>()
      allForKeys.forEach(r => { prodToKey.set(r.id, r.variantGroupId || r.id) })
      const keyCount = new Map<string, number>()
      grouped.forEach(g => {
        const pid = g.productId as string
        const key = prodToKey.get(pid) || pid
        if (seenKeys.has(key)) {
          keyCount.set(key, (keyCount.get(key) || 0) + (g._count?._all || 0))
        }
      })
      orderedGroupKeys.sort((a, b) => (keyCount.get(b) || 0) - (keyCount.get(a) || 0))
    }

    const totalDistinctCount = orderedGroupKeys.length
    const start = Math.max(0, (page - 1) * limit)
    const end = Math.min(totalDistinctCount, start + limit)
    const pageKeys = orderedGroupKeys.slice(start, end)

    // 2) Bu sayfaya düşen grup anahtarlarının (her biri ana ürün id’si) tam kayıtlarını al
    let products: any[] = []
    try {
      products = await prisma.product.findMany({
        where: { id: { in: pageKeys } },
        include: {
          category: {
            include: {
              translations: {
                where: {
                  OR: [
                    { locale },
                    { locale: { startsWith: locale } }
                  ]
                }
              }
            }
          },
          translations: {
            where: {
              OR: [
                { locale },
                { locale: { startsWith: locale } }
              ]
            }
          }
        }
      })
    } catch (err: any) {
      const code = err?.code || err?.name
      if (code === 'P2022') {
        products = await prisma.product.findMany({
          where: { id: { in: pageKeys } },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            price: true,
            images: true,
            stock: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                translations: {
                  where: {
                    OR: [
                      { locale },
                      { locale: { startsWith: locale } }
                    ]
                  },
                  select: { name: true, description: true }
                }
              }
            },
            translations: {
              where: {
                OR: [
                  { locale },
                  { locale: { startsWith: locale } }
                ]
              },
              select: { name: true, description: true, slug: true }
            }
          }
        })
      } else {
        throw err
      }
    }

    // 3) Sonuçları orijinal sıralamaya göre yeniden sırala (pageKeys sırasına göre)
    const orderMap = new Map<string, number>()
    pageKeys.forEach((k, i) => orderMap.set(k, i))
    products.sort((a, b) => (orderMap.get(a.id)! - orderMap.get(b.id)!))

    // Transform the data to use translated names when available
    const transformedProducts = await Promise.all(products.map(async (product) => {
      const translation = product.translations[0]
      const categoryTranslation = product.category.translations[0]

      // Parse images from JSON string to array
      const parsedImages = Array.isArray(product.images)
        ? product.images
        : JSON.parse(product.images || '[]')

      let nameOut = translation?.name || product.name
      let descOut = translation?.description || product.description

      if ((locale || '').startsWith('en') && !noTranslate) {
        const trChars = /[ğĞşŞçÇıİöÖüÜ]/
        const looksTurkish = trChars.test(nameOut) || trChars.test(descOut)
        const identical = (nameOut || '').trim() === (product.name || '').trim() && (descOut || '').trim() === (product.description || '').trim()
        if (looksTurkish || identical) {
          try {
            nameOut = await translateToEnglish(product.name)
            descOut = await translateToEnglish(product.description)
          } catch {
            // ignore and keep existing values
          }
        }
      }

      return {
        id: product.id,
        slug: (translation as any)?.slug || (product as any).slug || product.id,
        name: nameOut,
        description: descOut,
        price: product.price,
        originalPrice: (product as any).originalPrice,
        stock: product.stock,
        status: product.status,
        images: parsedImages,
        category: {
          id: product.category.id,
          name: categoryTranslation?.name || product.category.name,
          description: categoryTranslation?.description || product.category.description
        },
        originalName: product.name,
        originalDescription: product.description,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }
    }))

    const totalPages = Math.ceil(totalDistinctCount / limit)

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: totalDistinctCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}