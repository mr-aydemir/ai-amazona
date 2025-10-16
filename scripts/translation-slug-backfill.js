/*
  Translation slug backfill CLI script
  Usage: npm run slug:backfill:translations
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

async function uniqueTranslationSlug(name, locale) {
  const base = slugify(name) || 'urun'
  let candidate = base
  let i = 2
  while (true) {
    const exists = await prisma.productTranslation.count({ where: { locale, slug: candidate } })
    if (exists === 0) return candidate
    candidate = `${base}-${i}`
    i++
  }
}

async function main() {
  const translations = await prisma.productTranslation.findMany({
    select: { id: true, productId: true, locale: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' },
  })

  let updated = 0
  let skipped = 0

  for (const t of translations) {
    const current = (t.slug || '').trim()
    if (current) { skipped++; continue }

    const slug = await uniqueTranslationSlug(t.name, t.locale)
    await prisma.productTranslation.update({ where: { id: t.id }, data: { slug } })
    updated++
    console.log(`Updated translation ${t.id} (${t.locale}) -> ${slug}`)
  }

  console.log(JSON.stringify({ message: 'Translation slug backfill tamamlandı', updated, skipped, total: translations.length }, null, 2))
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })