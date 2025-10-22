import { PrismaClient } from '@prisma/client'
import { translate } from '@vitalets/google-translate-api'
import { HttpProxyAgent } from 'http-proxy-agent'
import { promises as fs } from 'fs'
import path from 'path'

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

// Slugify fonksiyonu
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

// Proxy yönetimi
let cachedProxies: string[] | null = null
let proxyCursor = 0
let lastListKey = ''

function normalizeProxy(raw: string | undefined | null): string | null {
  const val = String(raw ?? '').trim()
  if (!val) return null
  const withProtocol = val.startsWith('http://') || val.startsWith('https://') ? val : `http://${val}`
  try {
    new URL(withProtocol)
    return withProtocol
  } catch {
    return null
  }
}

async function getProxies(): Promise<string[]> {
  if (cachedProxies) return cachedProxies
  try {
    const filePath = path.join(process.cwd(), 'proxies.txt')
    const text = await fs.readFile(filePath, 'utf-8')
    const lines = text
      .split(/\r?\n/)
      .map((l) => normalizeProxy(l))
      .filter((v): v is string => Boolean(v))
    cachedProxies = lines
    return lines
  } catch {
    cachedProxies = []
    return []
  }
}

async function getCombinedProxyList(): Promise<string[]> {
  const envProxy = normalizeProxy(process.env.TRANSLATE_PROXY_URL)
  const fileProxies = await getProxies()
  const set = new Set<string>()
  if (envProxy) set.add(envProxy)
  for (const p of fileProxies) set.add(p)
  const list = Array.from(set)
  const key = list.join('|')
  if (key !== lastListKey) {
    lastListKey = key
    if (proxyCursor >= list.length) proxyCursor = 0
  }
  return list
}

async function translateWithVitalets(text: string): Promise<string> {
  const list = await getCombinedProxyList()
  if (list.length === 0) return text
  const ordered = list.slice(proxyCursor).concat(list.slice(0, proxyCursor))
  for (let i = 0; i < ordered.length; i++) {
    const proxyUrl = ordered[i]
    try {
      const agent = new HttpProxyAgent(proxyUrl)
      const result = await translate(text, {
        from: 'tr',
        to: 'en',
        fetchOptions: { agent },
      })
      const translated = (result as any)?.text
      if (typeof translated === 'string' && translated.length > 0) {
        proxyCursor = (proxyCursor + i) % list.length
        return translated
      }
    } catch (error: any) {
      continue
    }
  }
  proxyCursor = (proxyCursor + ordered.length) % list.length
  return text
}

async function translateToEnglish(text: string): Promise<string> {
  const input = (text || '').toString()
  if (!input.trim()) return ''
  try {
    return await translateWithVitalets(input)
  } catch {
    return input
  }
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