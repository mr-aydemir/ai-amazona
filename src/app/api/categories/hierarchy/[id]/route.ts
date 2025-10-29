import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { translateToEnglish } from '@/lib/translate'

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
        translations: { where: { OR: [{ locale }, { locale: { startsWith: locale } }] } },
        parent: {
          include: {
            translations: { where: { OR: [{ locale }, { locale: { startsWith: locale } }] } },
            parent: {
              include: {
                translations: { where: { OR: [{ locale }, { locale: { startsWith: locale } }] } },
                parent: {
                  include: {
                    translations: { where: { OR: [{ locale }, { locale: { startsWith: locale } }] } },
                    parent: {
                      include: {
                        translations: { where: { OR: [{ locale }, { locale: { startsWith: locale } }] } }
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
    const hierarchy: {
      id: string
      name: string
      slug: string
    }[] = []

    // Recursive function to build hierarchy
    async function buildHierarchy(cat: any): Promise<void> {
      if (cat.parent) {
        await buildHierarchy(cat.parent)
      }

      const translation = cat.translations?.[0]
      // Compute name with locale-aware fallback and auto-translate for EN if needed
      let nameOut: string = translation?.name || cat.name
      const baseLoc = String(locale || '').split('-')[0]
      if (baseLoc === 'en') {
        const trChars = /[ğĞşŞçÇıİöÖüÜ]/
        const looksTurkish = trChars.test(nameOut || '')
        const identical = (nameOut || '').trim() === (cat.name || '').trim()
        if (looksTurkish || identical) {
          try {
            nameOut = await translateToEnglish(cat.name)
          } catch {
            // keep existing value
          }
        }
      }

      hierarchy.push({
        id: cat.id,
        name: nameOut,
        slug: translation?.slug || cat.slug
      })
    }

    await buildHierarchy(category)

    return NextResponse.json({ hierarchy })
  } catch (error) {
    console.error('Kategori hiyerarşisi alınırken hata:', error)
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}