import prisma from '@/lib/prisma'
import type { AttributeType } from '@prisma/client'

export type ProductAttributeValueView = {
  attributeId: string
  key: string
  type: AttributeType
  name: string
  unit?: string | null
  value: string | number | boolean | null
}

export async function getProductAttributes(productId: string, locale: string): Promise<ProductAttributeValueView[]> {
  const rows = await prisma.productAttributeValue.findMany({
    where: { productId },
    include: {
      attribute: {
        include: {
          translations: { where: { locale } },
        },
      },
      option: {
        include: {
          translations: { where: { locale } },
        },
      },
    },
    orderBy: [
      { attribute: { sortOrder: 'asc' } },
      { createdAt: 'asc' },
    ],
  })

  return rows.map((row) => {
    const attr = row.attribute
    const attrName = attr.translations[0]?.name || attr.key
    const unit = attr.unit || null
    let value: string | number | boolean | null = null

    switch (attr.type) {
      case 'TEXT':
        value = row.valueText ?? null
        break
      case 'NUMBER':
        value = typeof row.valueNumber === 'number' ? row.valueNumber : null
        break
      case 'BOOLEAN':
        value = typeof row.valueBoolean === 'boolean' ? row.valueBoolean : null
        break
      case 'SELECT':
        value = row.option?.translations?.[0]?.name || row.option?.key || null
        break
      default:
        value = row.valueText ?? null
    }

    return {
      attributeId: attr.id,
      key: attr.key,
      type: attr.type,
      name: attrName,
      unit,
      value,
    }
  })
}

export async function getCategoryAttributes(categoryId: string, locale: string) {
  const attrs = await prisma.attribute.findMany({
    where: { categoryId, active: true },
    include: {
      translations: { where: { locale } },
      options: {
        where: { active: true },
        include: {
          translations: { where: { locale } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return attrs.map((it) => ({
    id: it.id,
    key: it.key,
    type: it.type,
    unit: it.unit,
    isRequired: it.isRequired,
    name: it.translations[0]?.name || it.key,
    options: it.options.map((opt) => ({
      id: opt.id,
      key: opt.key,
      name: opt.translations[0]?.name || opt.key || '',
    })),
  }))
}

// Inherited attributes: walk up parent chain and collect active attributes with translations/options
export async function getInheritedCategoryAttributes(categoryId: string, locale: string) {
  const collected: Array<{
    id: string
    key: string
    type: AttributeType
    unit: string | null
    isRequired: boolean
    name: string
    options: { id: string; key: string | null; name: string }[]
    originCategoryId: string
    originCategoryName: string
  }> = []

  let currentId: string | null = categoryId
  while (currentId) {
    const category: { id: string; parentId: string | null; name: string; translations: Array<{ name?: string }> } | null = await prisma.category.findUnique({
      where: { id: currentId },
      include: {
        translations: { where: { locale } },
      },
    })

    if (!category) break

    const originCategoryName = category.translations[0]?.name || category.name

    const attrs = await prisma.attribute.findMany({
      where: { categoryId: currentId, active: true },
      include: {
        translations: { where: { locale } },
        options: {
          where: { active: true },
          include: { translations: { where: { locale } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    for (const it of attrs) {
      collected.push({
        id: it.id,
        key: it.key,
        type: it.type,
        unit: it.unit ?? null,
        isRequired: it.isRequired,
        name: it.translations[0]?.name || it.key,
        options: it.options.map((opt) => ({
          id: opt.id,
          key: opt.key ?? null,
          name: opt.translations[0]?.name || opt.key || '',
        })),
        originCategoryId: category.id,
        originCategoryName,
      })
    }

    currentId = category.parentId ?? null
  }

  return collected
}