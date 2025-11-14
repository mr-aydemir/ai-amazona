const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const limitArg = [...args].find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 500

  const groups = await prisma.product.findMany({
    where: { NOT: { variantGroupId: null } },
    select: { id: true, categoryId: true, variantGroupId: true, variantAttributeId: true },
    orderBy: { createdAt: 'asc' },
  })

  let updated = 0
  for (const p of groups) {
    if (updated >= limit) break
    const groupId = p.variantGroupId
    const categoryId = p.categoryId
    const colorAttr = await prisma.attribute.findFirst({ where: { categoryId, type: 'SELECT', OR: [{ key: 'color' }, { key: 'renk' }] }, select: { id: true } })
    if (!colorAttr?.id) continue
    updated++
    if (!apply) {
      console.log(JSON.stringify({ groupId, setAttributeId: colorAttr.id, currentVariantAttributeId: p.variantAttributeId }, null, 2))
      continue
    }
    await prisma.$transaction(async (tx) => {
      // Set single-dimension pointer to color
      await tx.product.update({ where: { id: groupId }, data: { variantAttributeId: colorAttr.id } })
      // Ensure join mapping exists and at sortOrder 0
      await tx.productVariantAttribute.deleteMany({ where: { productId: groupId, attributeId: colorAttr.id } })
      await tx.productVariantAttribute.create({ data: { productId: groupId, attributeId: colorAttr.id, sortOrder: 0 } })
      // Compact sort order: place color first
      const rest = await tx.productVariantAttribute.findMany({ where: { productId: groupId, attributeId: { not: colorAttr.id } }, orderBy: { sortOrder: 'asc' } })
      for (let i = 0; i < rest.length; i++) {
        const j = rest[i]
        await tx.productVariantAttribute.update({ where: { id: j.id }, data: { sortOrder: i + 1 } })
      }
    })
  }

  console.log(JSON.stringify({ updated }, null, 2))
}

main().finally(() => prisma.$disconnect())