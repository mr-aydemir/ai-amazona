
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.analyticsSession.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  console.log('Recent Sessions:', sessions);
  
  const countryCounts = await prisma.analyticsSession.groupBy({
    by: ['country'],
    _count: true
  });
  
  console.log('Country Counts:', countryCounts);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
