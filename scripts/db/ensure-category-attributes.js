const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function ensureAttribute(categoryId, key, type, trName, enName) {
  let attr = await prisma.attribute.findFirst({ where: { categoryId, key } })
  if (!attr) {
    attr = await prisma.attribute.create({ data: { categoryId, key, type, active: true, sortOrder: 0, isRequired: false } })
    await prisma.attributeTranslation.createMany({ data: [ { attributeId: attr.id, locale: 'tr', name: trName }, { attributeId: attr.id, locale: 'en', name: enName } ] })
  }
  return attr
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const categories = await prisma.category.findMany({ select: { id: true } })
  for (const c of categories) {
    const colorAttr = await prisma.attribute.findFirst({ where: { categoryId: c.id, OR: [{ key: 'color' }, { key: 'renk' }], type: 'SELECT' } })
    const variantText = await prisma.attribute.findFirst({ where: { categoryId: c.id, key: 'variant_option', type: 'TEXT' } })
    const creates = []
    if (!colorAttr) creates.push({ key: 'renk', type: 'SELECT', trName: 'Renk', enName: 'Color' })
    if (!variantText) creates.push({ key: 'variant_option', type: 'TEXT', trName: 'Varyant', enName: 'Variant' })
    if (!creates.length) continue
    if (!apply) {
      process.stdout.write(JSON.stringify({ categoryId: c.id, willCreate: creates }, null, 2) + '\n')
      continue
    }
    for (const a of creates) {
      await ensureAttribute(c.id, a.key, a.type, a.trName, a.enName)
    }
  }
}

main().finally(() => prisma.$disconnect())

