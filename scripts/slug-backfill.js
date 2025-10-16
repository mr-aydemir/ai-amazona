/*
  Slug backfill CLI script
  Usage: npm run slug:backfill
*/

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function slugify(input) {
  if (!input || typeof input !== 'string') return ''
  const trMap = {
    'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g',
    'ç': 'c', 'Ç': 'c', 'ö': 'o', 'Ö': 'o', 'ü': 'u', 'Ü': 'u'
  }
  const replaced = input.split('').map(ch => trMap[ch] ?? ch).join('')
  return replaced
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function uniqueSlug(baseName) {
  let base = slugify(baseName)
  if (!base) base = 'urun'
  let candidate = base
  let i = 2
  while (true) {
    const exists = await prisma.product.findUnique({ where: { slug: candidate } })
    if (!exists) return candidate
    candidate = `${base}-${i}`
    i++
  }
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' },
  })

  let updated = 0
  let skipped = 0

  for (const p of products) {
    const current = (p.slug || '').trim()
    if (current) { skipped++; continue }

    const slug = await uniqueSlug(p.name)
    await prisma.product.update({ where: { id: p.id }, data: { slug } })
    updated++
    console.log(`Updated product ${p.id} -> ${slug}`)
  }

  console.log(JSON.stringify({ message: 'Slug backfill tamamlandı', updated, skipped, total: products.length }, null, 2))
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })