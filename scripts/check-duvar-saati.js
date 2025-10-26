const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { slug: 'duvar-saati' },
          { name: 'Duvar Saati' },
        ],
      },
      select: { id: true, name: true, slug: true },
    });

    console.log('Found category:', category);

    if (category) {
      const productCount = await prisma.product.count({ where: { categoryId: category.id } });
      console.log('Product count in this category:', productCount);
      const sample = await prisma.product.findMany({
        where: { categoryId: category.id },
        select: { id: true, name: true, slug: true },
        take: 3,
      });
      console.log('Sample products:', sample);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
})();