import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { translateToEnglish } from '@/lib/translate'

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

    // First, get all products in the category (excluding current product)
    const allProducts = await prisma.product.findMany({
      where: {
        categoryId,
        id: {
          not: currentProductId,
        },
      },
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

    // Filter to show only base products (not sub-variants)
    // For products with variantGroupId, only show the one where id === variantGroupId (base product)
    // For products without variantGroupId, show them as they are standalone products
    const baseProducts = allProducts.filter(product => {
      if (!product.variantGroupId) {
        // Standalone product (no variants)
        return true
      }
      // Only show if this is the base product (id matches variantGroupId)
      return product.id === product.variantGroupId
    })

    // Take only 6 products for related products section
    const relatedProducts = baseProducts.slice(0, 6)

    // Transform products to use translated names and descriptions
    const productsWithTranslations = await Promise.all(
      relatedProducts.map(async (product) => {
        const translation = product.translations[0]
        const categoryTranslation = product.category.translations[0]

        // For English locale, if translation doesn't exist, auto-translate
        let productName = translation?.name || product.name
        let productDescription = translation?.description || product.description
        let categoryName = categoryTranslation?.name || product.category.name
        let categoryDescription = categoryTranslation?.description || product.category.description

        if (locale === 'en' && !translation?.name) {
          try {
            productName = await translateToEnglish(product.name)
            if (product.description) {
              productDescription = await translateToEnglish(product.description)
            }
          } catch (error) {
            console.error('Translation error for product:', product.id, error)
            // Keep original text if translation fails
          }
        }

        if (locale === 'en' && !categoryTranslation?.name) {
          try {
            categoryName = await translateToEnglish(product.category.name)
            if (product.category.description) {
              categoryDescription = await translateToEnglish(product.category.description)
            }
          } catch (error) {
            console.error('Translation error for category:', product.category.id, error)
            // Keep original text if translation fails
          }
        }

        return {
          ...product,
          name: productName,
          description: productDescription,
          category: {
            ...product.category,
            name: categoryName,
            description: categoryDescription
          },
          images: product.images ? JSON.parse(product.images) : []
        }
      })
    )

    return NextResponse.json(productsWithTranslations)
  } catch (error) {
    console.error('Error fetching related products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}