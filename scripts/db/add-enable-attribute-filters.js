const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "SystemSetting" ADD COLUMN IF NOT EXISTS "enableAttributeFilters" BOOLEAN NOT NULL DEFAULT true;')
    console.log('Added column enableAttributeFilters to SystemSetting')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })