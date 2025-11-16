const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Attribute" ADD COLUMN IF NOT EXISTS "filterable" BOOLEAN NOT NULL DEFAULT false;')
    console.log('Added column filterable to Attribute')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })