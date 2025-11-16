const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const COLORS_TR_EN = {
  beyaz: 'White', siyah: 'Black', kırmızı: 'Red', kirmizi: 'Red', mavi: 'Blue', yeşil: 'Green', yesil: 'Green', sarı: 'Yellow', sari: 'Yellow', pembe: 'Pink', mor: 'Purple', kahverengi: 'Brown', turuncu: 'Orange', gri: 'Gray', lacivert: 'Navy', altın: 'Gold', altin: 'Gold', gümüş: 'Silver', gumus: 'Silver', bej: 'Beige', ekru: 'Ecru', şeffaf: 'Transparent', seffaf: 'Transparent', krem: 'Cream', bordo: 'Burgundy'
}

function normalizeTr(raw) {
  if (!raw) return ''
  let s = String(raw).trim()
  s = s.replace(/\([^)]+\)/g, '').trim()
  const parts = s.split(/[-–—|:]/).map(t => t.trim()).filter(Boolean)
  if (parts.length > 1) s = parts[parts.length - 1]
  const lc = s.toLowerCase().replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c')
  const keys = Object.keys(COLORS_TR_EN)
  for (const k of keys) {
    if (lc === k) return capitalizeTr(k)
  }
  return capitalizeTr(s)
}

function capitalizeTr(s) {
  s = String(s).trim()
  if (!s) return ''
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9-]/g,'')
}

async function findParentCategoryId() {
  const bySlug = await prisma.category.findFirst({ where: { slug: '3d-baski' }, select: { id: true } })
  if (bySlug?.id) return bySlug.id
  const byName = await prisma.category.findFirst({ where: { name: '3D Baskı' }, select: { id: true } })
  return byName?.id || null
}

async function findColorAttributeId(parentId) {
  const a = await prisma.attribute.findFirst({
    where: { categoryId: parentId, type: 'SELECT', OR: [{ key: 'renk' }, { key: 'color' }] },
    select: { id: true }
  })
  if (a?.id) return a.id
  const b = await prisma.attribute.findFirst({
    where: { categoryId: parentId, type: 'SELECT', translations: { some: { name: { in: ['Renk', 'Color'] } } } },
    select: { id: true }
  })
  return b?.id || null
}

async function normalizeOptions(attributeId) {
  const options = await prisma.attributeOption.findMany({ where: { attributeId }, include: { translations: true } })
  const mapCanonical = new Map()
  for (const opt of options) {
    const tr = (opt.translations || []).find(t => t.locale === 'tr')
    const en = (opt.translations || []).find(t => t.locale === 'en')
    const trName = normalizeTr(tr?.name || en?.name || opt.key || '')
    const key = slugify(trName)
    const enName = COLORS_TR_EN[key] || (en?.name ? en.name : trName)
    let canonical = mapCanonical.get(key)
    if (!canonical) {
      canonical = opt
      mapCanonical.set(key, canonical)
      await prisma.attributeOption.update({ where: { id: opt.id }, data: { key } })
      await prisma.attributeOptionTranslation.upsert({ where: { attributeOptionId_locale: { attributeOptionId: opt.id, locale: 'tr' } }, update: { name: trName }, create: { attributeOptionId: opt.id, locale: 'tr', name: trName } })
      await prisma.attributeOptionTranslation.upsert({ where: { attributeOptionId_locale: { attributeOptionId: opt.id, locale: 'en' } }, update: { name: enName }, create: { attributeOptionId: opt.id, locale: 'en', name: enName } })
    } else if (canonical.id !== opt.id) {
      await prisma.productAttributeValue.updateMany({ where: { attributeId: attributeId, attributeOptionId: opt.id }, data: { attributeOptionId: canonical.id, valueText: null } })
      await prisma.attributeOptionTranslation.deleteMany({ where: { attributeOptionId: opt.id } })
      await prisma.attributeOption.delete({ where: { id: opt.id } })
    }
  }
}

async function convertValueTextToOptions(attributeId) {
  const rows = await prisma.productAttributeValue.findMany({ where: { attributeId, attributeOptionId: null, valueText: { not: null } }, select: { id: true, productId: true, valueText: true } })
  for (const r of rows) {
    const trName = normalizeTr(r.valueText || '')
    if (!trName) continue
    const key = slugify(trName)
    let target = await prisma.attributeOption.findFirst({ where: { attributeId, key }, select: { id: true } })
    if (!target) {
      target = await prisma.attributeOption.create({ data: { attributeId, key, active: true, sortOrder: 0 } })
      await prisma.attributeOptionTranslation.createMany({ data: [ { attributeOptionId: target.id, locale: 'tr', name: trName }, { attributeOptionId: target.id, locale: 'en', name: COLORS_TR_EN[key] || trName } ] })
    }
    await prisma.productAttributeValue.update({ where: { id: r.id }, data: { attributeOptionId: target.id, valueText: null } })
  }
}

async function main() {
  const parentId = await findParentCategoryId()
  if (!parentId) {
    console.log(JSON.stringify({ error: 'parent_not_found' }))
    return
  }
  const colorAttrId = await findColorAttributeId(parentId)
  if (!colorAttrId) {
    console.log(JSON.stringify({ error: 'color_attribute_not_found', parentId }))
    return
  }
  await normalizeOptions(colorAttrId)
  await convertValueTextToOptions(colorAttrId)
  console.log(JSON.stringify({ normalized: true, parentId, colorAttrId }))
}

main().finally(() => prisma.$disconnect())