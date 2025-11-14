const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function containsIgnoreCase(haystack, needle) {
  return String(haystack || '').toLowerCase().includes(String(needle || '').toLowerCase())
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const limitArg = [...args].find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 500

  const products = await prisma.product.findMany({
    where: { NOT: { variantGroupId: null } },
    select: { id: true, categoryId: true, variantGroupId: true, variantAttributeId: true },
    orderBy: { createdAt: 'asc' },
  })

  let affectedGroups = 0
  for (const p of products) {
    if (affectedGroups >= limit) break
    const groupId = p.variantGroupId
    const categoryId = p.categoryId
    // Fetch category attributes once and detect Web Color ones
    const attrs = await prisma.attribute.findMany({
      where: { categoryId },
      include: { translations: true },
    })
    const webColorAttrIds = attrs
      .filter(a => containsIgnoreCase(a.key, 'web-color') || (Array.isArray(a.translations) && a.translations.some(t => containsIgnoreCase(t.name, 'web color'))))
      .map(a => a.id)
    if (webColorAttrIds.length === 0) continue

    const joins = await prisma.productVariantAttribute.findMany({
      where: { productId: groupId, attributeId: { in: webColorAttrIds } },
      orderBy: { sortOrder: 'asc' },
    })
    if (joins.length === 0) continue

    affectedGroups++

    if (!apply) {
      process.stdout.write(JSON.stringify({ groupId, removeAttributeIds: webColorAttrIds, currentVariantAttributeId: p.variantAttributeId }, null, 2) + '\n')
      continue
    }

    await prisma.$transaction(async (tx) => {
      // Remove web-color joins
      await tx.productVariantAttribute.deleteMany({ where: { productId: groupId, attributeId: { in: webColorAttrIds } } })

      // If the single-dimension pointer is set to a web-color attr, reassign or null
      let needsNull = false
      if (p.variantAttributeId && webColorAttrIds.includes(p.variantAttributeId)) {
        const remaining = await tx.productVariantAttribute.findMany({ where: { productId: groupId }, orderBy: { sortOrder: 'asc' } })
        if (remaining.length > 0) {
          await tx.product.update({ where: { id: groupId }, data: { variantAttributeId: remaining[0].attributeId } })
        } else {
          needsNull = true
        }
      }
      if (needsNull) {
        await tx.product.update({ where: { id: groupId }, data: { variantAttributeId: null } })
      }

      // Reindex sortOrder compactly for remaining joins
      const rest = await tx.productVariantAttribute.findMany({ where: { productId: groupId }, orderBy: { sortOrder: 'asc' } })
      for (let i = 0; i < rest.length; i++) {
        const j = rest[i]
        if (j.sortOrder !== i) {
          await tx.productVariantAttribute.update({ where: { id: j.id }, data: { sortOrder: i } })
        }
      }
    })
  }

  process.stdout.write(JSON.stringify({ affectedGroups }, null, 2))
}

main().finally(() => prisma.$disconnect())