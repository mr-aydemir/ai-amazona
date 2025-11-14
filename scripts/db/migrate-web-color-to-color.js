const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function ensureColorAttribute(categoryId) {
  let colorAttr = await prisma.attribute.findFirst({
    where: {
      categoryId,
      type: 'SELECT',
      OR: [
        { key: 'color' },
        { key: 'renk' },
        { key: { contains: 'color', mode: 'insensitive' } },
        { key: { contains: 'renk', mode: 'insensitive' } },
      ],
    },
    include: { translations: true },
  })
  if (!colorAttr) {
    colorAttr = await prisma.attribute.create({
      data: { categoryId, key: 'renk', type: 'SELECT', active: true, sortOrder: 0, isRequired: false },
    })
    await prisma.attributeTranslation.createMany({
      data: [
        { attributeId: colorAttr.id, locale: 'tr', name: 'Renk' },
        { attributeId: colorAttr.id, locale: 'en', name: 'Color' },
      ],
    })
  }
  return colorAttr
}

function pickLabelFromPAV(pav, locale) {
  const base = String(locale || 'tr').split('-')[0]
  if (pav?.option) {
    const tr = (pav.option.translations || []).find(t => t.locale === locale) || (pav.option.translations || []).find(t => t.locale === base)
    return (tr?.name || pav.option.key || '').trim()
  }
  return (pav?.valueText || '').trim()
}

async function ensureColorOption(attributeId, label) {
  const name = String(label || '').trim()
  if (!name) return null
  const existing = await prisma.attributeOption.findFirst({
    where: { attributeId, translations: { some: { name: { equals: name } } } },
    select: { id: true },
  })
  if (existing?.id) return existing.id
  const created = await prisma.attributeOption.create({ data: { attributeId, active: true, sortOrder: 0 } })
  await prisma.attributeOptionTranslation.create({ data: { attributeOptionId: created.id, locale: 'tr', name } })
  return created.id
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const limitArg = [...args].find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 500
  const locale = 'tr'

  const webColorAttrs = await prisma.attribute.findMany({
    where: {
      type: 'SELECT',
      OR: [
        { key: { contains: 'web-color', mode: 'insensitive' } },
        { translations: { some: { name: { contains: 'Web Color', mode: 'insensitive' } } } },
      ],
    },
    select: { id: true, categoryId: true, key: true },
  })

  let updatedGroups = 0
  for (const wc of webColorAttrs) {
    if (updatedGroups >= limit) break
    const colorAttr = await ensureColorAttribute(wc.categoryId)
    // Find groups using web-color as a variant dimension
    const joins = await prisma.productVariantAttribute.findMany({
      where: { attributeId: wc.id },
      select: { productId: true },
      orderBy: { sortOrder: 'asc' },
    })
    const groupIds = Array.from(new Set(joins.map(j => j.productId)))
    for (const groupId of groupIds) {
      if (updatedGroups >= limit) break
      updatedGroups++
      const siblings = await prisma.product.findMany({ where: { variantGroupId: groupId }, select: { id: true } })
      const sibIds = siblings.map(s => s.id)
      // Map each product's web-color PAV to color PAV
      const pavs = await prisma.productAttributeValue.findMany({
        where: { productId: { in: sibIds }, attributeId: wc.id },
        include: { option: { include: { translations: true } } },
      })
      if (!apply) {
        console.log(JSON.stringify({ groupId, willReplaceFromAttributeId: wc.id, toAttributeId: colorAttr.id, count: pavs.length }, null, 2))
        continue
      }
      await prisma.$transaction(async (tx) => {
        for (const pav of pavs) {
          const label = pickLabelFromPAV(pav, locale)
          const optId = await ensureColorOption(colorAttr.id, label)
          if (optId) {
            await tx.productAttributeValue.upsert({
              where: { productId_attributeId: { productId: pav.productId, attributeId: colorAttr.id } },
              update: { attributeOptionId: optId, valueText: null },
              create: { productId: pav.productId, attributeId: colorAttr.id, attributeOptionId: optId },
            })
          }
        }
        // Remove web-color dimension join and ensure color as first
        await tx.productVariantAttribute.deleteMany({ where: { productId: groupId, attributeId: wc.id } })
        await tx.productVariantAttribute.deleteMany({ where: { productId: groupId, attributeId: colorAttr.id } })
        await tx.productVariantAttribute.create({ data: { productId: groupId, attributeId: colorAttr.id, sortOrder: 0 } })
        // Reindex other joins
        const others = await tx.productVariantAttribute.findMany({ where: { productId: groupId, attributeId: { not: colorAttr.id } }, orderBy: { sortOrder: 'asc' } })
        for (let i = 0; i < others.length; i++) {
          await tx.productVariantAttribute.update({ where: { id: others[i].id }, data: { sortOrder: i + 1 } })
        }
        // Set single-dimension pointer to color if web-color was set
        const primary = await tx.product.findUnique({ where: { id: groupId }, select: { variantAttributeId: true } })
        if (primary?.variantAttributeId === wc.id) {
          await tx.product.update({ where: { id: groupId }, data: { variantAttributeId: colorAttr.id } })
        }
      })
    }
  }

  console.log(JSON.stringify({ updatedGroups }, null, 2))
}

main().finally(() => prisma.$disconnect())