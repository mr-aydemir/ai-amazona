import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ locale: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { locale } = await params

    if (!locale) {
      return NextResponse.json(
        { error: 'Locale parametresi gereklidir' },
        { status: 400 }
      )
    }

    // Fetch categories with translations for the specific locale
    const categories = await prisma.category.findMany({
      include: {
        translations: {
          where: {
            locale: locale
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform the data to use translated names when available
    const transformedCategories = categories.map(category => {
      const translation = category.translations[0]
      return {
        id: category.id,
        name: translation?.name || category.name,
        description: translation?.description || category.description,
        originalName: category.name,
        originalDescription: category.description,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }
    })

    return NextResponse.json(transformedCategories)

  } catch (error) {
    console.error('Categories fetch error:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}