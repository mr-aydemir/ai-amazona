import prisma from '@/lib/prisma'
import type { AttributeType } from '@prisma/client'

function baseOf(locale: string) {
  return String(locale || '').split('-')[0]
}

export function pickTranslatedName(translations: Array<{ locale?: string; name?: string }>, locale: string): string | undefined {
  if (!Array.isArray(translations)) return undefined
  const exact = translations.find((t) => t.locale === locale)?.name
  if (exact) return exact
  const base = baseOf(locale)
  const baseMatch = translations.find((t) => t.locale === base)?.name
  return baseMatch
}

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
          translations: { where: { OR: [{ locale }, { locale: baseOf(locale) }] } },
        },
      },
      option: {
        include: {
          translations: { where: { OR: [{ locale }, { locale: baseOf(locale) }] } },
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
    const attrName = pickTranslatedName(attr.translations as any, locale) || attr.key
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
        value = pickTranslatedName((row.option?.translations || []) as any, locale) || row.option?.key || null
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
    where: { categoryId, active: true, filterable: true },
    include: {
      translations: { where: { OR: [{ locale }, { locale: baseOf(locale) }] } },
      options: {
        where: { active: true },
        include: {
          translations: { where: { OR: [{ locale }, { locale: baseOf(locale) }] } },
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
    name: pickTranslatedName(it.translations as any, locale) || it.key,
    options: it.options.map((opt) => ({
      id: opt.id,
      key: opt.key,
      name: pickTranslatedName(opt.translations as any, locale) || opt.key || '',
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
    const category: { id: string; parentId: string | null; name: string; translations: Array<{ name?: string; locale?: string }> } | null = await prisma.category.findUnique({
      where: { id: currentId },
      include: {
        translations: { where: { OR: [{ locale }, { locale: baseOf(locale) }] } },
      },
    })

    if (!category) break

    const originCategoryName = pickTranslatedName(category.translations as any, locale) || category.name

    const attrs = await prisma.attribute.findMany({
      where: { categoryId: currentId, active: true, filterable: true },
      include: {
        translations: { where: { OR: [{ locale }, { locale: baseOf(locale) }] } },
        options: {
          where: { active: true },
          include: { translations: { where: { OR: [{ locale }, { locale: baseOf(locale) }] } } },
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
        name: pickTranslatedName(it.translations as any, locale) || it.key,
        options: it.options.map((opt) => ({
          id: opt.id,
          key: opt.key ?? null,
          name: pickTranslatedName(opt.translations as any, locale) || opt.key || '',
        })),
        originCategoryId: category.id,
        originCategoryName,
      })
    }

    currentId = category.parentId ?? null
  }

  return collected
}