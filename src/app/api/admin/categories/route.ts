import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import * as z from 'zod'

const categorySchema = z.object({
  name: z.string().min(1, 'Kategori adı gereklidir'),
  description: z.string().optional().default(''),
  parentId: z.string().optional().nullable(),
  translations: z.array(z.object({
    locale: z.string().min(1, 'Dil kodu gereklidir'),
    name: z.string().min(1, 'Çeviri adı gereklidir'),
    description: z.string().optional().default(''),
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
    console.log('Received category data:', body) // Debug log

    // Validate the request body
    const validatedData = categorySchema.parse(body)
    console.log('Validated data:', validatedData) // Debug log

    // Create the category
    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        parentId: validatedData.parentId,
        translations: {
          create: validatedData.translations.map(translation => ({
            locale: translation.locale,
            name: translation.name,
            description: translation.description,
          }))
        }
      },
      include: {
        translations: true,
        parent: true,
        children: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Kategori başarıyla eklendi',
        category
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Category creation error:', error)

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

    const categories = await prisma.category.findMany({
      include: {
        translations: true,
        parent: true,
        children: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(categories)

  } catch (error) {
    console.error('Categories fetch error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}