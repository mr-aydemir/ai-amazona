const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function cleanSuffix(baseName, name) {
  const b = String(baseName || '').trim()
  const n = String(name || '').trim()
  if (!b || !n) return n
  const esc = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^\s*${esc}\s*[-–—:|]\s*`, 'i')
  return n.replace(re, '').trim() || n
}

async function pickOrCreateOption(attributeId, label) {
  const trimmed = String(label || '').trim()
  if (!trimmed) return null
  const opt = await prisma.attributeOption.findFirst({ where: { attributeId, translations: { some: { name: trimmed } } }, select: { id: true } })
  if (opt?.id) return opt.id
  const created = await prisma.attributeOption.create({ data: { attributeId, active: true, sortOrder: 0 } })
  await prisma.attributeOptionTranslation.createMany({ data: [
    { attributeOptionId: created.id, locale: 'tr', name: trimmed },
    { attributeOptionId: created.id, locale: 'en', name: trimmed },
  ] })
  return created.id
}

async function resolveParentCategoryId(categoryId) {
  // Prefer slug '3d-baski'; else ascend to root
  const bySlug = await prisma.category.findFirst({ where: { slug: '3d-baski' }, select: { id: true } })
  if (bySlug?.id) return bySlug.id
  let cur = categoryId
  let last = categoryId
  // Walk up
  while (cur) {
    const c = await prisma.category.findUnique({ where: { id: cur }, select: { id: true, parentId: true } })
    if (!c) break
    last = c.id
    cur = c.parentId
  }
  return last
}

async function ensureParentColorAttribute(parentCategoryId) {
  let colorAttr = await prisma.attribute.findFirst({ where: { categoryId: parentCategoryId, type: 'SELECT', OR: [{ key: 'renk' }, { key: 'color' }] } })
  if (!colorAttr) {
    colorAttr = await prisma.attribute.create({ data: { categoryId: parentCategoryId, key: 'renk', type: 'SELECT', active: true, sortOrder: 0, isRequired: false } })
    await prisma.attributeTranslation.createMany({ data: [ { attributeId: colorAttr.id, locale: 'tr', name: 'Renk' }, { attributeId: colorAttr.id, locale: 'en', name: 'Color' } ] })
  }
  return colorAttr
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const limitArg = [...args].find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100
  const groups = await prisma.product.findMany({ where: { OR: [ { NOT: { variantGroupId: null } }, {} ] }, select: { id: true, name: true, categoryId: true, variantGroupId: true, createdAt: true } })
  const byGroup = new Map()
  for (const p of groups) {
    const gid = p.variantGroupId || null
    if (!gid) continue
    const arr = byGroup.get(gid) || []
    arr.push(p)
    byGroup.set(gid, arr)
  }
  let processed = 0
  for (const [gid, items] of byGroup.entries()) {
    if (processed >= limit) break
    if (!Array.isArray(items) || items.length < 2) continue
    processed++
    const primary = items.reduce((acc, cur) => (acc.createdAt <= cur.createdAt ? acc : cur))
    const parentCategoryId = await resolveParentCategoryId(primary.categoryId)
    const colorAttr = await ensureParentColorAttribute(parentCategoryId)
    const variantTextAttr = await prisma.attribute.findFirst({ where: { categoryId: parentCategoryId, key: 'variant_option', type: 'TEXT' } })
    let variantAttrId = variantTextAttr ? variantTextAttr.id : null
    if (!variantTextAttr && apply) {
      const v = await prisma.attribute.create({ data: { categoryId, key: 'variant_option', type: 'TEXT', active: true, sortOrder: 0, isRequired: false } })
      await prisma.attributeTranslation.createMany({ data: [ { attributeId: v.id, locale: 'tr', name: 'Varyant' }, { attributeId: v.id, locale: 'en', name: 'Variant' } ] })
      variantAttrId = v.id
    }
    // Derive color per product from existing PAV for any descendant color attribute; migrate to parent color
    const updates = []
    for (const it of items) {
      // Find any color PAV (descendant or parent) and get translated TR name
      const pav = await prisma.productAttributeValue.findFirst({
        where: {
          productId: it.id,
          OR: [
            { attribute: { type: 'SELECT', OR: [{ key: 'renk' }, { key: 'color' }] } },
            { attributeId: colorAttr.id }
          ]
        },
        include: { option: { include: { translations: true } }, attribute: true }
      })
      let trName = null
      if (pav?.option) {
        const t = pav.option.translations.find(x => x.locale === 'tr') || pav.option.translations[0]
        trName = t?.name || pav.option.key || null
      }
      // Fallback to product name suffix as before
      if (!trName) {
        const tTr = await prisma.productTranslation.findUnique({ where: { productId_locale: { productId: it.id, locale: 'tr' } } })
        const baseTr = await prisma.productTranslation.findUnique({ where: { productId_locale: { productId: primary.id, locale: 'tr' } } })
        const baseName = baseTr?.name || primary.name
        trName = cleanSuffix(baseName, tTr?.name || it.name)
      }
      updates.push({ productId: it.id, label: trName })
    }
    if (!apply) {
      process.stdout.write(JSON.stringify({ groupId: gid, categoryId, labels: updates }, null, 2) + '\n')
      continue
    }
    // Do operations without long-running single transaction to avoid timeouts
    await prisma.product.update({ where: { id: gid }, data: { variantAttributeId: colorAttr.id } })
    await prisma.productVariantAttribute.deleteMany({ where: { productId: gid } })
    await prisma.productVariantAttribute.create({ data: { productId: gid, attributeId: colorAttr.id, sortOrder: 0 } })
    for (const u of updates) {
      const optId = await pickOrCreateOption(colorAttr.id, u.label)
      if (optId) {
        await prisma.productAttributeValue.upsert({ where: { productId_attributeId: { productId: u.productId, attributeId: colorAttr.id } }, create: { productId: u.productId, attributeId: colorAttr.id, attributeOptionId: optId }, update: { attributeOptionId: optId, valueText: null } })
      }
      let vAttr = await prisma.attribute.findFirst({ where: { categoryId: parentCategoryId, key: 'variant_option', type: 'TEXT' } })
      if (!vAttr) {
        vAttr = await prisma.attribute.create({ data: { categoryId: parentCategoryId, key: 'variant_option', type: 'TEXT', active: true } })
        await prisma.attributeTranslation.createMany({ data: [ { attributeId: vAttr.id, locale: 'tr', name: 'Varyant' }, { attributeId: vAttr.id, locale: 'en', name: 'Variant' } ] })
      }
      await prisma.productAttributeValue.upsert({ where: { productId_attributeId: { productId: u.productId, attributeId: vAttr.id } }, create: { productId: u.productId, attributeId: vAttr.id, valueText: String(u.label || '').trim() }, update: { valueText: String(u.label || '').trim(), attributeOptionId: null } })
    }
  }
}

main().finally(() => prisma.$disconnect())

