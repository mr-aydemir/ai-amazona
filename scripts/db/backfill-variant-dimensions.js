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
  const opt = await prisma.attributeOption.findFirst({ where: { attributeId, translations: { some: { name: trimmed } } } })
  if (opt) return opt.id
  const created = await prisma.attributeOption.create({ data: { attributeId, active: true, sortOrder: 0 } })
  await prisma.attributeOptionTranslation.create({ data: { attributeOptionId: created.id, locale: 'tr', name: trimmed } })
  return created.id
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
    const categoryId = primary.categoryId
    let colorAttr = await prisma.attribute.findFirst({ where: { categoryId, OR: [{ key: 'color' }, { key: 'renk' }], type: 'SELECT' } })
    if (!colorAttr) {
      if (!apply) continue
      colorAttr = await prisma.attribute.create({ data: { categoryId, key: 'renk', type: 'SELECT', active: true, sortOrder: 0, isRequired: false } })
      await prisma.attributeTranslation.createMany({ data: [ { attributeId: colorAttr.id, locale: 'tr', name: 'Renk' }, { attributeId: colorAttr.id, locale: 'en', name: 'Color' } ] })
    }
    const variantTextAttr = await prisma.attribute.findFirst({ where: { categoryId, key: 'variant_option', type: 'TEXT' } })
    let variantAttrId = variantTextAttr ? variantTextAttr.id : null
    if (!variantTextAttr && apply) {
      const v = await prisma.attribute.create({ data: { categoryId, key: 'variant_option', type: 'TEXT', active: true, sortOrder: 0, isRequired: false } })
      await prisma.attributeTranslation.createMany({ data: [ { attributeId: v.id, locale: 'tr', name: 'Varyant' }, { attributeId: v.id, locale: 'en', name: 'Variant' } ] })
      variantAttrId = v.id
    }
    const trans = await prisma.productTranslation.findMany({ where: { productId: { in: items.map(i => i.id) }, locale: { in: ['tr', 'en'] } } })
    const baseTr = trans.find(t => t.productId === primary.id && t.locale === 'tr')
    const baseName = baseTr ? baseTr.name : primary.name
    const updates = []
    for (const it of items) {
      const tTr = trans.find(t => t.productId === it.id && t.locale === 'tr')
      const label = cleanSuffix(baseName, tTr ? tTr.name : it.name)
      updates.push({ productId: it.id, label })
    }
    if (!apply) {
      process.stdout.write(JSON.stringify({ groupId: gid, categoryId, labels: updates }, null, 2) + '\n')
      continue
    }
    await prisma.$transaction(async tx => {
      await tx.product.update({ where: { id: primary.id }, data: { variantAttributeId: colorAttr.id } })
      const existing = await tx.productVariantAttribute.findMany({ where: { productId: gid } })
      for (const e of existing) {
        await tx.productVariantAttribute.delete({ where: { id: e.id } })
      }
      await tx.productVariantAttribute.create({ data: { productId: gid, attributeId: colorAttr.id } })
      for (const u of updates) {
        const optId = await pickOrCreateOption(colorAttr.id, u.label)
        if (optId) {
          await tx.productAttributeValue.upsert({ where: { productId_attributeId: { productId: u.productId, attributeId: colorAttr.id } }, create: { productId: u.productId, attributeId: colorAttr.id, attributeOptionId: optId }, update: { attributeOptionId: optId } })
        }
        if (variantAttrId) {
          await tx.productAttributeValue.upsert({ where: { productId_attributeId: { productId: u.productId, attributeId: variantAttrId } }, create: { productId: u.productId, attributeId: variantAttrId, valueText: u.label }, update: { valueText: u.label } })
        }
      }
    })
  }
}

main().finally(() => prisma.$disconnect())

