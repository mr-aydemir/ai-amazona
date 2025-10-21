import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function toNewlines(text: string | null | undefined): string {
  const s = String(text ?? '')
  if (!s) return ''
  // Split by ';' (including full-width '；'), trim parts, drop empties, join with \n
  return s
    .split(/[;；]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join('\n')
}

async function run() {
  console.log('Starting semicolon→newline fix for ProductTranslation.description ...')
  const translations = await prisma.productTranslation.findMany({
    select: { id: true, description: true },
  })

  let changed = 0
  for (const t of translations) {
    const normalized = toNewlines(t.description)
    // Only update when it actually changes
    if (normalized !== (t.description ?? '')) {
      await prisma.productTranslation.update({
        where: { id: t.id },
        data: { description: normalized },
      })
      changed++
    }
  }

  console.log(`Processed ${translations.length} translations; updated ${changed}.`)
}

run()
  .catch((err) => {
    console.error('Error while updating product translations:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })