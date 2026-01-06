
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_LOCALES = ['en', 'tr']

async function main() {
  console.log('Starting category translation backfill...')

  const categories = await prisma.category.findMany({
    include: {
      translations: true
    }
  })

  console.log(`Found ${categories.length} categories.`)

  for (const category of categories) {
    console.log(`Processing category: ${category.name} (${category.id})`)

    // Identify available content source
    // Priority: Existing translation > Category fallback
    let sourceName = category.name
    let sourceDescription = category.description || ''
    let sourceSlug = category.slug || ''

    // If category fallback is empty/dummy, try to find a better source from existing translations
    if (category.translations.length > 0) {
        const bestTranslation = category.translations.find(t => t.name && t.name.trim().length > 0)
        if (bestTranslation) {
            sourceName = bestTranslation.name
            sourceDescription = bestTranslation.description || ''
            sourceSlug = bestTranslation.slug || ''
        }
    }

    for (const locale of TARGET_LOCALES) {
      const existingTranslation = category.translations.find(t => t.locale === locale)

      if (!existingTranslation) {
        console.log(`  - Missing translation for '${locale}'. Creating...`)
        
        // Ensure slug is unique-ish or just try best effort
        // If sourceSlug is empty, generate from name
        let slugToUse = sourceSlug
        if (!slugToUse) {
            slugToUse = sourceName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '')
        }

        try {
            await prisma.categoryTranslation.create({
                data: {
                    categoryId: category.id,
                    locale: locale,
                    name: sourceName, // usage of same name as fallback/copy
                    description: sourceDescription,
                    slug: slugToUse
                }
            })
            console.log(`    Created ${locale} translation.`)
        } catch (error) {
            console.error(`    Failed to create ${locale} translation:`, error)
        }
      } else {
        // Optional: Update if empty? 
        // For now, only backfill missing records.
      }
    }
  }

  console.log('Backfill complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
