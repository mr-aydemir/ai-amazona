
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const backupDir = path.join(process.cwd(), 'backups', new Date().toISOString().replace(/[:.]/g, '-'));

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function backup() {
  console.log(`Backing up to ${backupDir}...`);

  const models = [
    'user',
    'product',
    'category',
    'order',
    'orderItem',
    'review',
    'cart',
    'cartItem',
    'address',
    'favorite',
    'productTranslation',
    'categoryTranslation',
    'attribute',
    'attributeOption',
    'productAttributeValue',
    'productVariantAttribute'
  ];

  for (const model of models) {
    try {
      console.log(`Backing up ${model}...`);
      // @ts-ignore
      const data = await prisma[model].findMany();
      fs.writeFileSync(
        path.join(backupDir, `${model}.json`),
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.error(`Failed to backup ${model}:`, error);
    }
  }

  console.log('Backup completed.');
}

backup()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
