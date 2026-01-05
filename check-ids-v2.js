
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    take: 3,
    select: { id: true, slug: true }
  })
  console.log('Sample Products:', JSON.stringify(products, null, 2))

  const targetId = 'f5b4d8ac3559470bc743a450d68ff24e-tr0a7f4249d2634898068cde6113615caf'
  const p = await prisma.product.findUnique({ where: { id: targetId } })
  console.log('Found by ID:', p ? 'YES' : 'NO')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
