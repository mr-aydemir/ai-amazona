import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import * as z from 'zod'

const productSchema = z.object({
  name: z.string().min(1, 'Ürün adı gereklidir'),
  description: z.string().min(1, 'Açıklama gereklidir'),
  price: z.number().min(0, 'Fiyat 0 veya daha büyük olmalıdır'),
  stock: z.number().int().min(0, 'Stok 0 veya daha büyük olmalıdır'),
  categoryId: z.string().min(1, 'Kategori seçimi gereklidir'),
  images: z.array(z.string().min(1, 'Resim URL\'si gereklidir')).min(1, 'En az bir resim gereklidir').transform(val => JSON.stringify(val)),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  translations: z.array(z.object({
    locale: z.string().min(1, 'Dil kodu gereklidir'),
    name: z.string().min(1, 'Çeviri adı gereklidir'),
    description: z.string().min(1, 'Çeviri açıklaması gereklidir'),
  })).optional().default([]),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // Check if user is authenticated and is admin
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Bu işlem için admin yetkisi gerekiyor' },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log('Received product data:', body) // Debug log

    // Validate the request body
    const validatedData = productSchema.parse(body)
    console.log('Validated data:', validatedData) // Debug log

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: validatedData.categoryId }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Seçilen kategori bulunamadı' },
        { status: 400 }
      )
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        price: validatedData.price,
        stock: validatedData.stock,
        categoryId: validatedData.categoryId,
        images: validatedData.images,
        status: validatedData.status as any,
        translations: {
          create: validatedData.translations.map(translation => ({
            locale: translation.locale,
            name: translation.name,
            description: translation.description,
          }))
        }
      },
      include: {
        category: true,
        translations: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Ürün başarıyla eklendi',
        product
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Product creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Geçersiz veri',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    // Check if user is authenticated and is admin
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Giriş yapmanız gerekiyor' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Bu işlem için admin yetkisi gerekiyor' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const locale = searchParams.get('locale') || 'en'

    // Build where clause for filtering
    const where: any = {}

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ]
    }

    if (category) {
      where.categoryId = category
    }

    // Get total count for pagination
    const total = await prisma.product.count({ where })

    // Get products with pagination
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: {
          include: {
            translations: {
              where: { locale }
            }
          }
        },
        translations: {
          where: { locale }
        },
      },
    })

    // Apply translations and parse images for frontend
    const productsWithParsedImages = products.map(product => {
      const translation = product.translations?.[0]
      const categoryTranslation = product.category?.translations?.[0]
      return {
        ...product,
        name: translation?.name || product.name,
        description: translation?.description || product.description,
        category: {
          ...product.category,
          name: categoryTranslation?.name || product.category.name,
        },
        images: product.images ? JSON.parse(product.images) : []
      }
    })

    return NextResponse.json({
      products: productsWithParsedImages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })

  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}