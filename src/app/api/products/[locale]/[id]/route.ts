import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { translateToEnglish } from '@/lib/translate'

interface RouteParams {
  params: Promise<{ locale: string; id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { locale, id } = await params

    if (!locale || !id) {
      return NextResponse.json(
        { error: 'Locale ve ID parametreleri gereklidir' },
        { status: 400 }
      )
    }

    // Fetch product with translations for the specific locale
    const product = await prisma.product.findUnique({
      where: {
        id,
        status: 'ACTIVE'
      },
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
        },
        reviews: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      )
    }

    // Transform the data to use translated names when available
    const translation = product.translations[0]
    const categoryTranslation = product.category.translations[0]

    // Parse images from JSON string to array
    const parsedImages = Array.isArray(product.images)
      ? product.images
      : JSON.parse(product.images || '[]')

    let nameOut = translation?.name || product.name
    let descOut = translation?.description || product.description
    if ((locale || '').startsWith('en')) {
      const trChars = /[ğĞşŞçÇıİöÖüÜ]/
      const looksTurkish = trChars.test(nameOut) || trChars.test(descOut)
      const identical = (nameOut || '').trim() === (product.name || '').trim() && (descOut || '').trim() === (product.description || '').trim()
      if (looksTurkish || identical) {
        try {
          nameOut = await translateToEnglish(product.name)
          descOut = await translateToEnglish(product.description)
        } catch {
          // ignore
        }
      }
    }

    const transformedProduct = {
      id: product.id,
      name: nameOut,
      description: descOut,
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      status: product.status,
      images: parsedImages,
      category: {
        id: product.category.id,
        name: categoryTranslation?.name || product.category.name,
        description: categoryTranslation?.description || product.category.description
      },
      reviews: product.reviews.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        user: r.user ? { name: r.user.name, email: r.user.email } : null,
        guestName: r.guestName ?? null,
        guestEmail: r.guestEmail ?? null,
      })),
      originalName: product.name,
      originalDescription: product.description,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }

    return NextResponse.json(transformedProduct)

  } catch (error) {
    console.error('Product fetch error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}