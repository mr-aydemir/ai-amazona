/*
  Category slug backfill CLI script
  Usage: npm run category:slug:backfill
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function uniqueCategorySlug(baseName) {
  let base = slugify(baseName)
  if (!base) base = 'kategori'
  let candidate = base
  let i = 2
  while (true) {
    const exists = await prisma.category.findUnique({ where: { slug: candidate } })
    if (!exists) return candidate
    candidate = `${base}-${i}`
    i++
  }
}

async function main() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' },
  })

  let updated = 0
  let skipped = 0

  for (const c of categories) {
    const current = (c.slug || '').trim()
    if (current) { skipped++; continue }

    const slug = await uniqueCategorySlug(c.name)
    await prisma.category.update({ where: { id: c.id }, data: { slug } })
    updated++
    console.log(`Updated category ${c.id} -> ${slug}`)
  }

  console.log(JSON.stringify({ message: 'Kategori slug backfill tamamlandı', updated, skipped, total: categories.length }, null, 2))
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })