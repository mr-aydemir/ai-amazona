import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import * as z from 'zod'

const attributeUpdateSchema = z.object({
  key: z.string().optional(),
  type: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT']).optional(),
  unit: z.string().optional().nullable(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  filterable: z.boolean().optional(),
  active: z.boolean().optional(),
  translations: z.array(z.object({
    locale: z.string().min(1),
    name: z.string().min(1),
  })).optional(),
  options: z.array(z.object({
    id: z.string().optional(),
    key: z.string().optional().nullable(),
    sortOrder: z.number().int().optional().default(0),
    active: z.boolean().optional().default(true),
    translations: z.array(z.object({
      locale: z.string().min(1),
      name: z.string().min(1),
    })).min(1),
  })).optional(),
})

interface RouteParams {
  params: Promise<{ id: string, attrId: string }>
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })

    const { id, attrId } = await params
    const body = await request.json()
    const data = attributeUpdateSchema.parse(body)

    // Confirm attribute belongs to category
    const attr = await prisma.attribute.findUnique({ where: { id: attrId } })
    if (!attr || attr.categoryId !== id) return NextResponse.json({ error: 'Atribut bulunamadı' }, { status: 404 })

    const updated = await prisma.attribute.update({
      where: { id: attrId },
      data: {
        key: data.key ?? undefined,
        type: data.type ?? undefined,
        unit: data.unit ?? undefined,
        isRequired: data.isRequired ?? undefined,
        sortOrder: data.sortOrder ?? undefined,
        filterable: data.filterable ?? undefined,
        active: data.active ?? undefined,
        translations: data.translations ? {
          deleteMany: {},
          create: data.translations.map(t => ({ locale: t.locale, name: t.name }))
        } : undefined,
        options: data.options ? {
          deleteMany: {},
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

    return NextResponse.json({ message: 'Atribut güncellendi', attribute: updated })
  } catch (error) {
    console.error('Category attribute PUT error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })

    const { id, attrId } = await params

    const attr = await prisma.attribute.findUnique({ where: { id: attrId } })
    if (!attr || attr.categoryId !== id) return NextResponse.json({ error: 'Atribut bulunamadı' }, { status: 404 })

    // ensure no product values referencing
    const count = await prisma.productAttributeValue.count({ where: { attributeId: attrId } })
    if (count > 0) {
      return NextResponse.json({ error: 'Bu atribut ürün değerleri ile ilişkili. Önce değerleri kaldırın.' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.attributeOption.deleteMany({ where: { attributeId: attrId } })
      await tx.attribute.delete({ where: { id: attrId } })
    })

    return NextResponse.json({ message: 'Atribut silindi' })
  } catch (error) {
    console.error('Category attribute DELETE error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}