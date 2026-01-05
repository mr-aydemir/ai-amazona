
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const target = 'f5b4d8ac3559470bc743a450d68ff24e-tr0a7f4249d2634898068cde6113615caf'
  
  const bySlug = await prisma.product.findUnique({
    where: { slug: target }
  })
  
  if (bySlug) {
      console.log('FOUND_AS_SLUG')
      console.log('ID:', bySlug.id)
  } else {
      console.log('NOT_FOUND_AS_SLUG')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
