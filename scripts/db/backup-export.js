const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const prisma = new PrismaClient()

function nowDir() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  const dir = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
  return dir
}

async function main() {
  const baseDir = path.join(process.cwd(), 'backups', nowDir())
  fs.mkdirSync(baseDir, { recursive: true })
  const products = await prisma.product.findMany({ select: { id: true, name: true, categoryId: true, variantGroupId: true, variantAttributeId: true, createdAt: true, updatedAt: true } })
  const attributes = await prisma.attribute.findMany({ include: { translations: true, options: { include: { translations: true } } } })
  const pavs = await prisma.productAttributeValue.findMany({})
  const trans = await prisma.productTranslation.findMany({})
  const pvaJoin = await prisma.productVariantAttribute.findMany({})
  fs.writeFileSync(path.join(baseDir, 'products.json'), JSON.stringify(products, null, 2))
  fs.writeFileSync(path.join(baseDir, 'attributes.json'), JSON.stringify(attributes, null, 2))
  fs.writeFileSync(path.join(baseDir, 'product_attribute_values.json'), JSON.stringify(pavs, null, 2))
  fs.writeFileSync(path.join(baseDir, 'product_translations.json'), JSON.stringify(trans, null, 2))
  fs.writeFileSync(path.join(baseDir, 'product_variant_attributes.json'), JSON.stringify(pvaJoin, null, 2))
  process.stdout.write(baseDir)
}

main().finally(() => prisma.$disconnect())

