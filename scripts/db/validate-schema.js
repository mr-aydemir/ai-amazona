const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const resProductVariantAttribute = await prisma.$queryRaw`SELECT 1 FROM information_schema.tables WHERE table_name = 'ProductVariantAttribute'`
  const hasPVA = Array.isArray(resProductVariantAttribute) && resProductVariantAttribute.length > 0
  const resVariantAttributeId = await prisma.$queryRaw`SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'variantAttributeId'`
  const hasVariantAttributeId = Array.isArray(resVariantAttributeId) && resVariantAttributeId.length > 0
  const out = { hasProductVariantAttributeTable: !!hasPVA, hasProductVariantAttributeIdColumn: !!hasVariantAttributeId }
  process.stdout.write(JSON.stringify(out, null, 2))
}

main().finally(() => prisma.$disconnect())

