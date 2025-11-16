import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { getCurrencyData, convertServer } from '@/lib/server-currency'

const ITEMS_PER_PAGE = 12

export async function GET(request: NextRequest) {
  try {
    // Determine user's preferred currency (if authenticated)
    const session = await auth()
    const userId = session?.user?.id
    const { baseCurrency, rates } = await getCurrencyData()
    let displayCurrency = baseCurrency
    if (userId) {
      try {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { preferredLocale: true } })
        displayCurrency = u?.preferredLocale === 'en' ? 'USD' : baseCurrency
      } catch (e) {
        displayCurrency = baseCurrency
      }
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const minPriceParam = searchParams.get('minPrice')
    const maxPriceParam = searchParams.get('maxPrice')
    const minPrice = typeof minPriceParam === 'string' ? parseFloat(minPriceParam) : undefined
    const maxPrice = typeof maxPriceParam === 'string' ? parseFloat(maxPriceParam) : undefined
    const sort = searchParams.get('sort')

    // Validate page parameter
    if (page < 1) {
      return NextResponse.json(
        { error: 'Geçersiz sayfa numarası' },
        { status: 400 }
      )
    }

    // Validate price parameters only if provided
    if ((minPrice !== undefined && minPrice < 0) || (maxPrice !== undefined && maxPrice < 0)) {
      return NextResponse.json({ error: 'Geçersiz fiyat aralığı' }, { status: 400 })
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return NextResponse.json({ error: 'Geçersiz fiyat aralığı' }, { status: 400 })
    }

    // Adjust thresholds: from display currency (potentially incl. VAT) to base currency net
    let minNet = minPrice
    let maxNet = maxPrice
    try {
      const settings = await prisma.systemSetting.findFirst({ select: { showPricesInclVat: true, vatRate: true } })
      const showInclVat = !!settings?.showPricesInclVat
      const vatRate = typeof settings?.vatRate === 'number' ? settings!.vatRate : 0
      const vatFactor = showInclVat ? (1 + vatRate) : 1
      const rateMap = Object.fromEntries(rates.map((r: any) => [r.currency, r.rate])) as Record<string, number>
      const baseRate = rateMap[baseCurrency] ?? 1
      const displayRate = rateMap[displayCurrency] ?? baseRate
      const currencyRatio = displayRate / baseRate
      const totalDivisor = vatFactor * currencyRatio
      if (minNet !== undefined) minNet = minNet / totalDivisor
      if (maxNet !== undefined) maxNet = maxNet / totalDivisor
    } catch { /* ignore */ }

    // Build where clause for filtering
    const whereParts: Prisma.ProductWhereInput[] = [{ status: 'ACTIVE' }]
    if (minNet !== undefined) whereParts.push({ price: { gte: minNet } })
    if (maxNet !== undefined) whereParts.push({ price: { lte: maxNet } })
    if (category) whereParts.push({ OR: [{ categoryId: category }, { category: { is: { slug: category } } }] })
    if (search) {
      whereParts.push({
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      })
    }
    const where: Prisma.ProductWhereInput = { AND: whereParts }

    // Build orderBy clause for sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = {}
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

    // Get total count for pagination
    const total = await prisma.product.count({ where })

    // Get products with pagination
    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        category: true,
      },
    })

    // Parse images from JSON strings to arrays for frontend
    const productsWithParsedImages = products.map(product => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      displayPrice: convertServer(product.price, baseCurrency, displayCurrency, rates),
      currency: displayCurrency,
    }))

    return NextResponse.json({
      products: productsWithParsedImages,
      total,
      perPage: ITEMS_PER_PAGE,
      page,
      totalPages: Math.ceil(total / ITEMS_PER_PAGE),
      currency: displayCurrency,
    })
  } catch (error) {
    console.error('Products API Error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
