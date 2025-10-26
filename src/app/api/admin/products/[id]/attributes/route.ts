import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getInheritedCategoryAttributes } from '@/lib/eav'
import * as z from 'zod'

const valueItemSchema = z.object({
  attributeId: z.string().min(1),
  valueText: z.string().optional().nullable(),
  valueNumber: z.number().optional().nullable(),
  valueBoolean: z.boolean().optional().nullable(),
  attributeOptionId: z.string().optional().nullable(),
})

const valuesUpdateSchema = z.object({
  values: z.array(valueItemSchema).min(1)
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
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })

    const locale = request.nextUrl.searchParams.get('locale') || 'tr'

    const attributes = await getInheritedCategoryAttributes(product.categoryId, locale)

    const values = await prisma.productAttributeValue.findMany({
      where: { productId: id },
      select: {
        attributeId: true,
        attributeOptionId: true,
        valueText: true,
        valueNumber: true,
        valueBoolean: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ attributes, values })
  } catch (error) {
    console.error('Product attributes GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })

    const { id } = await params
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })

    const body = await request.json()
    const parsed = valuesUpdateSchema.parse(body)

    await prisma.$transaction(async (tx) => {
      for (const item of parsed.values) {
        const attr = await tx.attribute.findUnique({ where: { id: item.attributeId } })
        if (!attr) throw new Error('Atribut bulunamadı')

        // Validate value based on type
        const data: any = {
          productId: product.id,
          attributeId: item.attributeId,
          attributeOptionId: null,
          valueText: null,
          valueNumber: null,
          valueBoolean: null,
        }

        if (attr.type === 'TEXT') {
          data.valueText = item.valueText ?? null
        } else if (attr.type === 'NUMBER') {
          data.valueNumber = item.valueNumber ?? null
        } else if (attr.type === 'BOOLEAN') {
          // Ensure boolean is either true/false or null
          data.valueBoolean = typeof item.valueBoolean === 'boolean' ? item.valueBoolean : null
        } else if (attr.type === 'SELECT') {
          if (item.attributeOptionId) {
            const opt = await tx.attributeOption.findUnique({ where: { id: item.attributeOptionId } })
            if (!opt || opt.attributeId !== attr.id) {
              throw new Error('Geçersiz seçenek')
            }
            data.attributeOptionId = opt.id
          } else {
            data.attributeOptionId = null
          }
        }

        await tx.productAttributeValue.upsert({
          where: { productId_attributeId: { productId: product.id, attributeId: attr.id } },
          update: data,
          create: data,
        })
      }
    })

    return NextResponse.json({ message: 'Ürün atribut değerleri güncellendi' })
  } catch (error) {
    console.error('Product attributes PUT error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Geçersiz veri', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}