const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findParentCategoryId() {
  const bySlug = await prisma.category.findFirst({ where: { slug: '3d-baski' }, select: { id: true } })
  if (bySlug?.id) return bySlug.id
  const byName = await prisma.category.findFirst({ where: { name: '3D Baskı' }, select: { id: true } })
  return byName?.id || null
}

async function pickCanonicalColorAttribute(parentId) {
  const attrs = await prisma.attribute.findMany({
    where: { categoryId: parentId, type: 'SELECT', OR: [{ key: 'renk' }, { key: 'color' }, { translations: { some: { name: { in: ['Renk','Color'] } } } }] },
    select: { id: true }
  })
  if (attrs.length === 0) return null
  if (attrs.length === 1) return attrs[0].id
  // choose attr with highest number of used options
  let bestId = attrs[0].id
  let bestUsed = -1
  for (const a of attrs) {
    const used = await prisma.productAttributeValue.count({ where: { attributeId: a.id, attributeOptionId: { not: null } } })
    if (used > bestUsed) { bestUsed = used; bestId = a.id }
  }
  return bestId
}

async function cleanupUnusedOptions(attributeId) {
  const options = await prisma.attributeOption.findMany({ where: { attributeId }, select: { id: true } })
  let removed = 0
  for (const opt of options) {
    const usage = await prisma.productAttributeValue.count({ where: { attributeId, attributeOptionId: opt.id } })
    if (usage === 0) {
      await prisma.attributeOptionTranslation.deleteMany({ where: { attributeOptionId: opt.id } })
      await prisma.attributeOption.delete({ where: { id: opt.id } })
      removed++
    }
  }
  return removed
}

async function main() {
  const parentId = await findParentCategoryId()
  if (!parentId) { console.log(JSON.stringify({ error: 'parent_not_found' })); return }
  const attrId = await pickCanonicalColorAttribute(parentId)
  if (!attrId) { console.log(JSON.stringify({ error: 'color_attribute_not_found', parentId })); return }
  const removed = await cleanupUnusedOptions(attrId)
  console.log(JSON.stringify({ cleaned: true, parentId, attrId, removed }))
}

main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect())