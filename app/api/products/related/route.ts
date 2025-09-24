import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
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
      },
    })

    // Parse images from JSON strings to arrays for frontend
    const productsWithParsedImages = relatedProducts.map(product => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : []
    }))

    return NextResponse.json(productsWithParsedImages)
  } catch (error) {
    console.error('Error fetching related products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
