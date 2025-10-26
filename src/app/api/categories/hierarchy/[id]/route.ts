import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const locale = searchParams.get('locale') || 'tr'

    if (!id) {
      return NextResponse.json(
        { error: 'Kategori ID\'si gereklidir' },
        { status: 400 }
      )
    }

    // Kategoriyi ve parent hiyerarşisini al
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        translations: { where: { locale } },
        parent: {
          include: {
            translations: { where: { locale } },
            parent: {
              include: {
                translations: { where: { locale } },
                parent: {
                  include: {
                    translations: { where: { locale } },
                    parent: {
                      include: {
                        translations: { where: { locale } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Kategori bulunamadı' },
        { status: 404 }
      )
    }

    // Hiyerarşiyi oluştur (en üstten başlayarak)
    const hierarchy: Array<{
      id: string
      name: string
      slug: string
    }> = []

    // Recursive function to build hierarchy
    function buildHierarchy(cat: any): void {
      if (cat.parent) {
        buildHierarchy(cat.parent)
      }

      const translation = cat.translations?.[0]
      hierarchy.push({
        id: cat.id,
        name: translation?.name || cat.name,
        slug: cat.slug
      })
    }

    buildHierarchy(category)

    return NextResponse.json({ hierarchy })
  } catch (error) {
    console.error('Kategori hiyerarşisi alınırken hata:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}