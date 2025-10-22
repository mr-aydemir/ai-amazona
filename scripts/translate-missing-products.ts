import { PrismaClient } from '@prisma/client'
import { translateToEnglish } from '../src/lib/translate'
import { slugify } from '../src/lib/slugify'

const prisma = new PrismaClient()

interface ProductWithTranslations {
  id: string
  name: string
  description: string
  slug: string | null
  translations: {
    locale: string
    name: string
    description: string
    slug: string | null
  }[]
}

async function translateMissingProducts() {
  console.log('🔍 Çevirisi eksik ürünler aranıyor...')

  try {
    // Tüm aktif ürünleri ve mevcut çevirilerini getir
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        translations: {
          select: {
            locale: true,
            name: true,
            description: true,
            slug: true
          }
        }
      }
    }) as ProductWithTranslations[]

    console.log(`📊 Toplam ${products.length} aktif ürün bulundu`)

    const supportedLocales = ['tr', 'en']
    let translatedCount = 0
    let skippedCount = 0

    for (const product of products) {
      console.log(`\n🔄 İşleniyor: ${product.name} (ID: ${product.id})`)

      // Her dil için çeviri kontrolü
      for (const locale of supportedLocales) {
        const existingTranslation = product.translations.find(t => t.locale === locale)

        if (existingTranslation) {
          console.log(`  ✅ ${locale.toUpperCase()} çevirisi mevcut`)
          skippedCount++
          continue
        }

        console.log(`  🚀 ${locale.toUpperCase()} çevirisi oluşturuluyor...`)

        try {
          let translatedName = product.name
          let translatedDescription = product.description

          // Eğer hedef dil İngilizce ise ve kaynak Türkçe ise çevir
          if (locale === 'en') {
            console.log(`    📝 "${product.name}" çevriliyor...`)
            translatedName = await translateToEnglish(product.name)
            
            console.log(`    📝 Açıklama çevriliyor...`)
            translatedDescription = await translateToEnglish(product.description)
            
            // Kısa bir bekleme (API rate limiting için)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

          // Slug oluştur
          const translatedSlug = slugify(translatedName)

          // Çeviriyi veritabanına kaydet
          await prisma.productTranslation.create({
            data: {
              productId: product.id,
              locale: locale,
              name: translatedName,
              description: translatedDescription,
              slug: translatedSlug
            }
          })

          console.log(`    ✅ ${locale.toUpperCase()} çevirisi kaydedildi`)
          console.log(`       İsim: ${translatedName}`)
          console.log(`       Slug: ${translatedSlug}`)
          
          translatedCount++

        } catch (error) {
          console.error(`    ❌ ${locale.toUpperCase()} çevirisi başarısız:`, error)
        }
      }
    }

    console.log(`\n🎉 İşlem tamamlandı!`)
    console.log(`📈 Toplam ${translatedCount} yeni çeviri oluşturuldu`)
    console.log(`⏭️  ${skippedCount} çeviri zaten mevcuttu`)

  } catch (error) {
    console.error('❌ Hata oluştu:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Script'i çalıştır
if (require.main === module) {
  translateMissingProducts()
    .then(() => {
      console.log('✅ Script başarıyla tamamlandı')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Script hatası:', error)
      process.exit(1)
    })
}

export { translateMissingProducts }