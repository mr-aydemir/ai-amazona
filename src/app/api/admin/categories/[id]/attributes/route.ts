import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import * as z from 'zod'

const attributeCreateSchema = z.object({
  key: z.string().min(1, 'Anahtar gereklidir'),
  type: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT']),
  unit: z.string().optional().nullable(),
  isRequired: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
  filterable: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  translations: z.array(z.object({
    locale: z.string().min(1),
    name: z.string().min(1),
  })).min(1, 'En az bir çeviri gereklidir'),
  options: z.array(z.object({
    key: z.string().optional().nullable(),
    sortOrder: z.number().int().optional().default(0),
    active: z.boolean().optional().default(true),
    translations: z.array(z.object({
      locale: z.string().min(1),
      name: z.string().min(1),
    })).min(1),
  })).optional().default([]),
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
    if (!session?.user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })

    const { id } = await params
    const locale = request.nextUrl.searchParams.get('locale') || 'tr'

    const attrs = await prisma.attribute.findMany({
      where: { categoryId: id },
      include: {
        translations: true,
        options: {
          include: { translations: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(attrs.map((it) => {
        // Find specific locale translation for list view
        const currentTranslation = it.translations.find(t => t.locale === locale)
        return {
            id: it.id,
            key: it.key,
            type: it.type,
            unit: it.unit,
            isRequired: it.isRequired,
            sortOrder: it.sortOrder,
            filterable: it.filterable,
            active: it.active,
            name: currentTranslation?.name || it.key, // Fallback for list view
            translations: it.translations, // Return all translations for edit mode
            options: it.options.map((opt) => {
                const optTranslation = opt.translations.find(ot => ot.locale === locale)
                return {
                    id: opt.id,
                    key: opt.key,
                    sortOrder: opt.sortOrder,
                    active: opt.active,
                    name: optTranslation?.name || opt.key || '',
                    translations: opt.translations // Return all translations for edit mode
                }
            }),
        }
    }))
  } catch (error) {
    console.error('Category attributes GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const data = attributeCreateSchema.parse(body)

    // Ensure category exists
    const category = await prisma.category.findUnique({ where: { id } })
    if (!category) return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 })

    const created = await prisma.attribute.create({
      data: {
        categoryId: id,
        key: data.key,
        type: data.type,
        unit: data.unit ?? undefined,
        isRequired: data.isRequired ?? false,
        sortOrder: data.sortOrder ?? 0,
        filterable: data.filterable ?? false,
        active: data.active ?? true,
        translations: {
          create: data.translations.map(t => ({ locale: t.locale, name: t.name }))
        },
        options: data.type === 'SELECT' && data.options && data.options.length > 0 ? {
          create: data.options.map(o => ({
            key: o.key ?? undefined,
            sortOrder: o.sortOrder ?? 0,
            active: o.active ?? true,
            translations: { create: o.translations.map(ot => ({ locale: ot.locale, name: ot.name })) },
          }))
        } : undefined,
      },
      include: {
        translations: true,
        options: { include: { translations: true } },
      }
    })

    return NextResponse.json({ message: 'Atribut oluşturuldu', attribute: created }, { status: 201 })
  } catch (error) {
    console.error('Category attributes POST error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}