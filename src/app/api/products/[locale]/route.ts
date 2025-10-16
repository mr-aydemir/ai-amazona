import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { translateToEnglish } from '@/lib/translate'

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
        gte: minPrice,
        lte: maxPrice
      }
    }

    if (category && category !== 'all') {
      where.categoryId = category
    }

    if (search) {
      where.OR = [
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

    const skip = (page - 1) * limit

    // Fetch products with translations for the specific locale
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            include: {
              translations: {
                where: {
                  locale: locale
                }
              }
            }
          },
          translations: {
            where: {
              locale: locale
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ])

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

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
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