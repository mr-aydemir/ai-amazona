const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const CANON_TR = {
  gumus: 'Gümüş',
  kirmizi: 'Kırmızı',
  yesil: 'Yeşil',
  beyaz: 'Beyaz',
  siyah: 'Siyah',
  mavi: 'Mavi',
  sari: 'Sarı',
  pembe: 'Pembe',
  mor: 'Mor',
  kahverengi: 'Kahverengi',
  turuncu: 'Turuncu',
  gri: 'Gri',
  lacivert: 'Lacivert',
  altin: 'Altın',
  bej: 'Bej',
  ekru: 'Ekru',
  seffaf: 'Şeffaf',
  krem: 'Krem',
  bordo: 'Bordo'
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function normalizeTrRaw(s) {
  if (!s) return ''
  let x = String(s).trim()
  x = x.replace(/\([^)]+\)/g, '').trim()
  const parts = x.split(/[-–—|:]/).map(t => t.trim()).filter(Boolean)
  if (parts.length > 1) x = parts[parts.length - 1]
  return x
}

async function findParentCategoryId() {
  const bySlug = await prisma.category.findFirst({ where: { slug: '3d-baski' }, select: { id: true } })
  if (bySlug?.id) return bySlug.id
  const byName = await prisma.category.findFirst({ where: { name: '3D Baskı' }, select: { id: true } })
  return byName?.id || null
}

async function pickCanonicalColorAttribute(parentId) {
  const attrs = await prisma.attribute.findMany({
    where: { categoryId: parentId, type: 'SELECT', OR: [{ key: 'renk' }, { key: 'color' }, { translations: { some: { name: { in: ['Renk', 'Color'] } } } }] },
    select: { id: true }
  })
  if (attrs.length === 0) return null
  if (attrs.length === 1) return attrs[0].id
  let bestId = attrs[0].id
  let bestUsed = -1
  for (const a of attrs) {
    const used = await prisma.productAttributeValue.count({ where: { attributeId: a.id, attributeOptionId: { not: null } } })
    if (used > bestUsed) { bestUsed = used; bestId = a.id }
  }
  return bestId
}

async function dedupeOptions(attributeId) {
  const options = await prisma.attributeOption.findMany({ where: { attributeId }, include: { translations: true } })
  const groups = new Map()

  for (const opt of options) {
    const tr = (opt.translations || []).find(t => t.locale === 'tr')
    const base = normalizeTrRaw(tr?.name || opt.key || '')
    const slug = slugify(base).replace(/-/g, '')
    const arr = groups.get(slug) || []
    arr.push(opt)
    groups.set(slug, arr)
  }

  let migrated = 0
  let removed = 0

  for (const [slug, arr] of groups.entries()) {
    if (arr.length <= 1) {
      const sole = arr[0]
      const trCanon = CANON_TR[slug]
      if (trCanon) {
        await prisma.attributeOption.update({ where: { id: sole.id }, data: { key: slug } })
        await prisma.attributeOptionTranslation.upsert({ where: { attributeOptionId_locale: { attributeOptionId: sole.id, locale: 'tr' } }, update: { name: trCanon }, create: { attributeOptionId: sole.id, locale: 'tr', name: trCanon } })
      }
      continue
    }
    // pick canonical: prefer the one whose TR name equals CANON_TR
    const trCanon = CANON_TR[slug]
    let canonical = arr.find(opt => (opt.translations || []).find(t => t.locale === 'tr')?.name === trCanon)
    if (!canonical) canonical = arr[0]
    // ensure canonical translation/key
    if (trCanon) {
      await prisma.attributeOption.update({ where: { id: canonical.id }, data: { key: slug } })
      await prisma.attributeOptionTranslation.upsert({ where: { attributeOptionId_locale: { attributeOptionId: canonical.id, locale: 'tr' } }, update: { name: trCanon }, create: { attributeOptionId: canonical.id, locale: 'tr', name: trCanon } })
    }
    // migrate others to canonical
    for (const opt of arr) {
      if (opt.id === canonical.id) continue
      const count = await prisma.productAttributeValue.count({ where: { attributeId, attributeOptionId: opt.id } })
      if (count > 0) {
        await prisma.productAttributeValue.updateMany({ where: { attributeId, attributeOptionId: opt.id }, data: { attributeOptionId: canonical.id, valueText: null } })
        migrated += count
      }
      await prisma.attributeOptionTranslation.deleteMany({ where: { attributeOptionId: opt.id } })
      await prisma.attributeOption.delete({ where: { id: opt.id } })
      removed += 1
    }
  }
  return { migrated, removed }
}

async function main() {
  const parentId = await findParentCategoryId()
  if (!parentId) { console.log(JSON.stringify({ error: 'parent_not_found' })); return }
  const attrId = await pickCanonicalColorAttribute(parentId)
  if (!attrId) { console.log(JSON.stringify({ error: 'color_attribute_not_found', parentId })); return }
  const { migrated, removed } = await dedupeOptions(attrId)
  console.log(JSON.stringify({ deduped: true, parentId, attrId, migrated, removed }))
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())