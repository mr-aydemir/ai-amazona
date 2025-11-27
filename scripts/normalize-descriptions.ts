import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeNewlines(input: string | null | undefined): string {
  if (typeof input !== 'string') return ''
  let s = input.replace(/\r/g, '')
  s = s.replace(/(\n\s*){2,}/g, '\n')
  s = s.replace(/(<br\s*\/?>\s*){2,}/gi, '<br/>')
  return s
}

async function run() {
  let updated = 0
  let touched = 0
  const batch = 500
  let skip = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const products = await prisma.product.findMany({ select: { id: true, description: true }, skip, take: batch, orderBy: { id: 'asc' } })
    if (products.length === 0) break
    for (const p of products) {
      const norm = normalizeNewlines(p.description)
      if (norm !== (p.description || '')) {
        await prisma.product.update({ where: { id: p.id }, data: { description: norm } })
        updated++
      }
      touched++
      const translations = await prisma.productTranslation.findMany({ where: { productId: p.id }, select: { locale: true, description: true } })
      for (const t of translations) {
        const n2 = normalizeNewlines(t.description)
        if (n2 !== (t.description || '')) {
          await prisma.productTranslation.update({ where: { productId_locale: { productId: p.id, locale: t.locale } }, data: { description: n2 } })
          updated++
        }
      }
    }
    skip += products.length
    console.log(`Processed ${skip}, updated ${updated}`)
  }
  await prisma.$disconnect()
  console.log(`Done. Updated ${updated}, touched ${touched}`)
}

run().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})

