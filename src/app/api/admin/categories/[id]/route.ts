import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import * as z from 'zod'

const categoryUpdateSchema = z.object({
  name: z.string().optional().refine(val => val === undefined || val.length > 0, 'Kategori adı boş olamaz'),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
  translations: z.array(z.object({
    locale: z.string().min(1, 'Dil kodu gereklidir'),
    name: z.string().min(1, 'Çeviri adı gereklidir'),
    description: z.string().optional().default(''),
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
        { error: 'Kategori ID\'si gereklidir' },
        { status: 400 }
      )
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        translations: true,
        parent: true,
        children: true,
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Kategori bulunamadı' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)

  } catch (error) {
    console.error('Category fetch error:', error)
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
        { error: 'Kategori ID\'si gereklidir' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate the request body
    const validatedData = categoryUpdateSchema.parse(body)

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Kategori bulunamadı' },
        { status: 404 }
      )
    }

    // Update the category
    const updatedCategory = await prisma.category.update({
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
        translations: true,
      },
    })

    return NextResponse.json({
      message: 'Kategori başarıyla güncellendi',
      category: updatedCategory
    })

  } catch (error) {
    console.error('Category update error:', error)

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
        { error: 'Kategori ID\'si gereklidir' },
        { status: 400 }
      )
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Kategori bulunamadı' },
        { status: 404 }
      )
    }

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: { categoryId: id }
    })

    if (productsCount > 0) {
      return NextResponse.json(
        { error: 'Bu kategoriye ait ürünler var. Önce ürünleri silin veya başka kategoriye taşıyın.' },
        { status: 400 }
      )
    }

    // Delete the category (translations will be deleted automatically due to cascade)
    await prisma.category.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Kategori başarıyla silindi'
    })

  } catch (error) {
    console.error('Category deletion error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}