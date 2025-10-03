import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import * as z from 'zod'

const productUpdateSchema = z.object({
  name: z.string().optional().refine(val => val === undefined || val.length > 0, 'Ürün adı boş olamaz'),
  description: z.string().optional().refine(val => val === undefined || val.length > 0, 'Açıklama boş olamaz'),
  price: z.number().min(0, 'Fiyat 0 veya daha büyük olmalıdır').optional(),
  stock: z.number().int().min(0, 'Stok 0 veya daha büyük olmalıdır').optional(),
  categoryId: z.string().optional().refine(val => val === undefined || val.length > 0, 'Kategori seçimi gereklidir'),
  images: z.array(z.string()).min(1, 'En az bir resim gereklidir').transform(val => JSON.stringify(val)).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  translations: z.array(z.object({
    locale: z.string().min(1, 'Dil kodu gereklidir'),
    name: z.string().min(1, 'Çeviri adı gereklidir'),
    description: z.string().min(1, 'Çeviri açıklaması gereklidir'),
  })).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Ürün ID\'si gereklidir' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        translations: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      )
    }

    // Parse images from JSON string to array for frontend
    const productWithParsedImages = {
      ...product,
      images: product.images ? JSON.parse(product.images) : []
    }

    return NextResponse.json(productWithParsedImages)

  } catch (error) {
    console.error('Product fetch error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Ürün ID\'si gereklidir' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate the request body
    const validatedData = productUpdateSchema.parse(body)

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      )
    }

    // If categoryId is provided, check if category exists
    if (validatedData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: validatedData.categoryId }
      })

      if (!category) {
        return NextResponse.json(
          { error: 'Seçilen kategori bulunamadı' },
          { status: 400 }
        )
      }
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...validatedData,
        translations: validatedData.translations ? {
          deleteMany: {},
          create: validatedData.translations.map(translation => ({
            locale: translation.locale,
            name: translation.name,
            description: translation.description,
          }))
        } : undefined
      },
      include: {
        category: true,
        translations: true,
      },
    })

    return NextResponse.json({
      message: 'Ürün başarıyla güncellendi',
      product: updatedProduct
    })

  } catch (error) {
    console.error('Product update error:', error)

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

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Ürün ID\'si gereklidir' },
        { status: 400 }
      )
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: true,
        cartItems: true,
        reviews: true
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      )
    }

    // Check if product has any orders
    if (existingProduct.orderItems.length > 0) {
      return NextResponse.json(
        { error: 'Bu ürün siparişlerde kullanıldığı için silinemez. Ürünü pasif duruma getirebilirsiniz.' },
        { status: 400 }
      )
    }

    // Delete related data first
    await prisma.$transaction(async (tx) => {
      // Delete cart items
      await tx.cartItem.deleteMany({
        where: { productId: id }
      })

      // Delete reviews
      await tx.review.deleteMany({
        where: { productId: id }
      })

      // Finally delete the product
      await tx.product.delete({
        where: { id }
      })
    })

    return NextResponse.json({
      message: 'Ürün başarıyla silindi'
    })

  } catch (error) {
    console.error('Product delete error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}