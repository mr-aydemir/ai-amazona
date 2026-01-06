import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import * as z from 'zod'
import { uniqueSlug } from '@/lib/slugify'

const categorySchema = z.object({
  name: z.string().min(1, 'Kategori adı gereklidir'),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
  translations: z.array(z.object({
    locale: z.string().min(1, 'Dil kodu gereklidir'),
    name: z.string().min(1, 'Çeviri adı gereklidir'),
    description: z.string().optional().default(''),
  })).optional(),
})

export async function GET() {
  const cats = await prisma.category.findMany({
    include: {
      translations: true,
      parent: {
        include: {
          translations: true
        }
      },
      children: true
    },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(cats)
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = categorySchema.parse(body)

    const slug = await uniqueSlug(validatedData.name, async (candidate) => {
      const count = await prisma.category.count({ where: { slug: candidate } })
      return count > 0
    })

    const translations = validatedData.translations || []
    
    // Create translation slugs and prepare create data
    const translationsCreate = await Promise.all(translations.map(async (t) => {
       const tSlug = await uniqueSlug(t.name, async (candidate) => {
         const count = await prisma.categoryTranslation.count({ where: { locale: t.locale, slug: candidate } })
         return count > 0
       })
       return {
         locale: t.locale,
         name: t.name,
         description: t.description,
         slug: tSlug
       }
    }))

    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || '',
        slug,
        parentId: validatedData.parentId,
        translations: {
          create: translationsCreate
        }
      },
      include: {
        translations: true
      }
    })

    return NextResponse.json(category, { status: 201 })

  } catch (error) {
    console.error('Error creating category:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Geçersiz veri', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    )
  }
}
