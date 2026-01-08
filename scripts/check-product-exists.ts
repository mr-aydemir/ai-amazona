
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const slug = process.argv[2];

async function main() {
  if (!slug) {
    console.log('Please provide a slug');
    return;
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, name: true }
  });

  if (product) {
    console.log(`Product found: ${product.name} (${product.id})`);
  } else {
    console.log('Product not found');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
