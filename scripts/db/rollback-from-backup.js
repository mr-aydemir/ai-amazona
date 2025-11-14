const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const dirArg = args.find(a => a.startsWith('--dir='))
  if (!dirArg) { process.stderr.write('Missing --dir=path'); process.exit(1) }
  const dir = dirArg.split('=')[1]
  const apply = args.includes('--apply')
  const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf-8'))
  const products = read('products.json')
  const attributes = read('attributes.json')
  const pavs = read('product_attribute_values.json')
  const pvaJoin = read('product_variant_attributes.json')
  if (!apply) {
    process.stdout.write(JSON.stringify({ counts: { products: products.length, attributes: attributes.length, pavs: pavs.length, joins: pvaJoin.length } }, null, 2))
    return
  }
  await prisma.$transaction(async tx => {
    for (const p of products) {
      await tx.product.update({ where: { id: p.id }, data: { variantAttributeId: p.variantAttributeId || null } })
    }
    for (const j of pvaJoin) {
      const exists = await tx.productVariantAttribute.findFirst({ where: { productId: j.productId, attributeId: j.attributeId } })
      if (!exists) await tx.productVariantAttribute.create({ data: { productId: j.productId, attributeId: j.attributeId } })
    }
    for (const v of pavs) {
      await tx.productAttributeValue.upsert({ where: { productId_attributeId: { productId: v.productId, attributeId: v.attributeId } }, create: { productId: v.productId, attributeId: v.attributeId, attributeOptionId: v.attributeOptionId || null, valueText: v.valueText || null, valueNumber: v.valueNumber || null, valueBoolean: v.valueBoolean || null }, update: { attributeOptionId: v.attributeOptionId || null, valueText: v.valueText || null, valueNumber: v.valueNumber || null, valueBoolean: v.valueBoolean || null } })
    }
  })
  process.stdout.write('done')
}

main().finally(() => prisma.$disconnect())

