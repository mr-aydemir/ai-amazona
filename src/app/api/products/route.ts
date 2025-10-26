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
    const minPrice = parseFloat(searchParams.get('minPrice') || '0')
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999')
    const sort = searchParams.get('sort')

    // Validate page parameter
    if (page < 1) {
      return NextResponse.json(
        { error: 'Geçersiz sayfa numarası' },
        { status: 400 }
      )
    }

    // Validate price parameters
    if (minPrice < 0 || maxPrice < 0 || minPrice > maxPrice) {
      return NextResponse.json(
        { error: 'Geçersiz fiyat aralığı' },
        { status: 400 }
      )
    }

    // Build where clause for filtering
    const where: Prisma.ProductWhereInput = {
      AND: [
        { status: 'ACTIVE' }, // Only show active products to public
        { price: { gte: minPrice } },
        { price: { lte: maxPrice } },
        ...(category ? [{ OR: [{ categoryId: category }, { category: { is: { slug: category } } }] }] : []),
        ...(search
          ? [
            {
              OR: [
                {
                  name: {
                    contains: search,
                  },
                },
                {
                  description: {
                    contains: search,
                  },
                },
              ],
            },
          ]
          : []),
      ],
    }

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
