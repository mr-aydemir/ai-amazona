
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Checking first 5 products ---')
  const products = await prisma.product.findMany({
    take: 5,
    select: { id: true, name: true, slug: true }
  })
  console.log(products)

  const targetId = 'f5b4d8ac3559470bc743a450d68ff24e-tr0a7f4249d2634898068cde6113615caf'
  console.log(`\n--- Searching for ID: ${targetId} ---`)
  const specificProduct = await prisma.product.findUnique({
    where: { id: targetId }
  })
  console.log('Result:', specificProduct)
  
  // Try partial match or other fields just in case
  console.log(`\n--- Searching for slug containing part of ID ---`)
  // First 32 chars
  const partId = targetId.split('-')[0]
  const similarProd = await prisma.product.findFirst({
      where: {
          OR: [
              { slug: { contains: partId } },
              { name: { contains: partId } }
          ]
      }
  })
  console.log('Similar Result:', similarProd)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
