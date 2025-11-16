const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const COLORS = ['beyaz','siyah','kirmizi','kırmızı','mavi','yesil','yeşil','sari','sarı','pembe','mor','kahverengi','turuncu','gri','lacivert','altin','altın','gumus','gümüş','bej','ekru','seffaf','şeffaf','krem','bordo']

function normalizeTr(s) {
  if (!s) return ''
  let x = String(s).trim()
  x = x.replace(/\([^)]+\)/g, '').trim()
  const parts = x.split(/[-–—|:]/).map(t => t.trim()).filter(Boolean)
  if (parts.length > 1) x = parts[parts.length - 1]
  return x
}

function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
}

async function parentCategoryId() {
  const bySlug = await prisma.category.findFirst({ where: { slug: '3d-baski' }, select: { id: true } })
  if (bySlug?.id) return bySlug.id
  const byName = await prisma.category.findFirst({ where: { name: '3D Baskı' }, select: { id: true } })
  return byName?.id || null
}

async function getParentColorAttrs(parentId) {
  return prisma.attribute.findMany({ where: { categoryId: parentId, type: 'SELECT', OR: [{ key: 'renk' }, { key: 'color' }, { translations: { some: { name: { in: ['Renk','Color'] } } } }] }, include: { options: { include: { translations: true } } } })
}

function isCanonical(attr) {
  let ok = 0, total = 0
  for (const opt of attr.options) {
    const tr = (opt.translations||[]).find(t=>t.locale==='tr')
    const name = tr?.name || opt.key || ''
    const sl = slugify(name).replace(/-/g,'')
    total++
    if (COLORS.includes(sl)) ok++
  }
  return ok >= Math.max(1, Math.floor(total*0.6))
}

async function ensureCanonicalOption(attributeId, trName) {
  const n = String(trName||'').trim()
  if (!n) return null
  const ex = await prisma.attributeOption.findFirst({ where: { attributeId, translations: { some: { locale: 'tr', name: n } } }, select: { id: true } })
  if (ex?.id) return ex.id
  const key = slugify(n)
  const created = await prisma.attributeOption.create({ data: { attributeId, key, active: true, sortOrder: 0 } })
  await prisma.attributeOptionTranslation.createMany({ data: [ { attributeOptionId: created.id, locale: 'tr', name: n }, { attributeOptionId: created.id, locale: 'en', name: n } ] })
  return created.id
}

async function migrateFromNoisyToCanonical(parentId, canonicalId, noisyId) {
  const pavs = await prisma.productAttributeValue.findMany({ where: { attributeId: noisyId }, include: { option: { include: { translations: true } } } })
  for (const pav of pavs) {
    const labelRaw = pav.option?.translations?.find(t=>t.locale==='tr')?.name || pav.option?.key || ''
    const trName = normalizeTr(labelRaw)
    const optId = await ensureCanonicalOption(canonicalId, trName)
    if (optId) {
      await prisma.productAttributeValue.upsert({ where: { productId_attributeId: { productId: pav.productId, attributeId: canonicalId } }, update: { attributeOptionId: optId, valueText: null }, create: { productId: pav.productId, attributeId: canonicalId, attributeOptionId: optId } })
    }
  }
  await prisma.productVariantAttribute.deleteMany({ where: { attributeId: noisyId } })
  const groups = await prisma.productVariantAttribute.findMany({ where: { attributeId: canonicalId }, select: { productId: true } })
  const groupIds = Array.from(new Set(groups.map(g=>g.productId)))
  for (const gid of groupIds) {
    await prisma.product.update({ where: { id: gid }, data: { variantAttributeId: canonicalId } })
    const exists = await prisma.productVariantAttribute.findFirst({ where: { productId: gid, attributeId: canonicalId } })
    if (!exists) await prisma.productVariantAttribute.create({ data: { productId: gid, attributeId: canonicalId, sortOrder: 0 } })
  }
  const noisyOpts = await prisma.attributeOption.findMany({ where: { attributeId: noisyId }, select: { id: true } })
  const noisyOptIds = noisyOpts.map(o=>o.id)
  if (noisyOptIds.length) {
    await prisma.attributeOptionTranslation.deleteMany({ where: { attributeOptionId: { in: noisyOptIds } } })
    await prisma.attributeOption.deleteMany({ where: { id: { in: noisyOptIds } } })
  }
  await prisma.attribute.delete({ where: { id: noisyId } })
}

async function removeSubcategoryColors(parentId, canonicalId) {
  const subs = await prisma.category.findMany({ where: { parentId: parentId }, select: { id: true } })
  for (const sub of subs) {
    const attrs = await prisma.attribute.findMany({ where: { categoryId: sub.id, type: 'SELECT', OR: [{ key: 'renk' }, { key: 'color' }] }, select: { id: true } })
    for (const a of attrs) {
      const pavs = await prisma.productAttributeValue.findMany({ where: { attributeId: a.id }, include: { option: { include: { translations: true } } } })
      for (const pav of pavs) {
        const label = pav.option?.translations?.find(t=>t.locale==='tr')?.name || pav.option?.key || ''
        const trName = normalizeTr(label)
        const optId = await ensureCanonicalOption(canonicalId, trName)
        if (optId) {
          await prisma.productAttributeValue.upsert({ where: { productId_attributeId: { productId: pav.productId, attributeId: canonicalId } }, update: { attributeOptionId: optId, valueText: null }, create: { productId: pav.productId, attributeId: canonicalId, attributeOptionId: optId } })
        }
      }
      await prisma.productVariantAttribute.deleteMany({ where: { attributeId: a.id } })
      const aOpts = await prisma.attributeOption.findMany({ where: { attributeId: a.id }, select: { id: true } })
      const aOptIds = aOpts.map(o=>o.id)
      if (aOptIds.length) {
        await prisma.attributeOptionTranslation.deleteMany({ where: { attributeOptionId: { in: aOptIds } } })
        await prisma.attributeOption.deleteMany({ where: { id: { in: aOptIds } } })
      }
      await prisma.attribute.delete({ where: { id: a.id } })
    }
  }
}

async function main() {
  const parentId = await parentCategoryId()
  if (!parentId) { console.log(JSON.stringify({ error: 'parent_not_found' })); return }
  const colorAttrs = await getParentColorAttrs(parentId)
  if (colorAttrs.length < 1) { console.log(JSON.stringify({ error: 'no_parent_color' })); return }
  let canonical = null, noisy = null
  if (colorAttrs.length === 1) { canonical = colorAttrs[0] } else {
    const a = colorAttrs[0], b = colorAttrs[1]
    canonical = isCanonical(a) ? a : (isCanonical(b) ? b : colorAttrs[0])
    noisy = canonical.id === a.id ? b : a
  }
  if (!canonical) { console.log(JSON.stringify({ error: 'canonical_not_found' })); return }
  if (noisy) await migrateFromNoisyToCanonical(parentId, canonical.id, noisy.id)
  await removeSubcategoryColors(parentId, canonical.id)
  console.log(JSON.stringify({ done: true, parentId, canonicalId: canonical.id, noisyRemoved: !!noisy }))
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect())