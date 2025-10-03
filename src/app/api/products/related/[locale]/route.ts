import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ locale: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { locale } = await params
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const currentProductId = searchParams.get('currentProductId')

    if (!categoryId || !currentProductId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId,
        id: {
          not: currentProductId,
        },
      },
      take: 6,
      include: {
        reviews: true,
        translations: {
          where: {
            locale: locale
          }
        },
        category: {
          include: {
            translations: {
              where: {
                locale: locale
              }
            }
          }
        }
      },
    })

    // Transform products to use translated names and descriptions
    const productsWithTranslations = relatedProducts.map(product => {
      const translation = product.translations[0]
      const categoryTranslation = product.category.translations[0]
      
      return {
        ...product,
        name: translation?.name || product.name,
        description: translation?.description || product.description,
        category: {
          ...product.category,
          name: categoryTranslation?.name || product.category.name,
          description: categoryTranslation?.description || product.category.description
        },
        images: product.images ? JSON.parse(product.images) : []
      }
    })

    return NextResponse.json(productsWithTranslations)
  } catch (error) {
    console.error('Error fetching related products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}