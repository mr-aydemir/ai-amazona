import prisma from '@/lib/prisma'

const STOPWORDS = new Set([
  've', 'ile', 'icin', 'bir', 'bu', 'da', 'de', 'daha', 'cok', 'gibi', 'olan', 'olarak',
  'veya', 'ama', 'fakat', 'kadar', 'sonra', 'once', 'her', 'hem', 'ne', 'nasil', 'neden',
  'hangi', 'mi', 'mu', 'misiniz', 'nedir', 'rehber', 'rehberi', 'yeni', 'baslayanlar',
  'ipuclari', 'oneriler', 'pratik', 'dogru', 'baski', 'baskili', 'dekoratif', 'dekorasyon',
  'urun', 'urunler', 'ev', 'yasam', 'alan', 'alanlari', 'fikir', 'fikirleri', 'model',
  'modeller', 'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'were',
  'you', 'your', 'our', 'their', 'have', 'has', 'not', 'but', 'can', 'will', 'how', 'what',
  'when', 'why', 'into', 'about', 'more', 'most', 'than', 'then', 'they', 'them', 'its',
  'guide', 'practical', 'tips', 'beginner', 'beginners', 'new', 'using', 'use', 'best',
])

const SYNONYMS: Record<string, string[]> = {
  figur: ['figur', 'biblo', 'heykel', 'sus', 'susleme', 'koi', 'balik', 'kedi', 'kopek', 'hayvan', 'karakter'],
  figure: ['figure', 'figures', 'figur', 'biblo', 'heykel', 'koi', 'animal', 'cat', 'dog'],
  lamba: ['lamba', 'abajur', 'avize', 'aydinlatma', 'isik', 'gece', 'masa'],
  lamp: ['lamp', 'lamps', 'light', 'lighting', 'shade', 'abajur'],
  lighting: ['lighting', 'lamp', 'lamps', 'light', 'shade', 'abajur'],
  hediye: ['hediye', 'isim', 'isimli', 'anahtarlik', 'kisiye', 'ozel', 'kurumsal'],
  gift: ['gift', 'gifts', 'personalized', 'name', 'keychain', 'ornament'],
  gifts: ['gift', 'gifts', 'personalized', 'name', 'keychain', 'ornament'],
  vazo: ['vazo', 'saksi', 'cicek', 'bitki'],
  vase: ['vase', 'planter', 'flower', 'plant'],
  duzen: ['duzenleyici', 'organizer', 'kalemlik', 'stand', 'tutucu', 'raf'],
  malzeme: ['pla', 'petg', 'filament', 'malzeme', 'dayanikli', 'dayaniklilik'],
  material: ['material', 'materials', 'pla', 'petg', 'filament', 'durable', 'durability'],
  materials: ['material', 'materials', 'pla', 'petg', 'filament', 'durable', 'durability'],
  durability: ['durability', 'durable', 'pla', 'petg', 'filament', 'material'],
  bakim: ['bakim', 'temizlik', 'koruma', 'onarim'],
  care: ['care', 'cleaning', 'clean', 'protection', 'repair'],
  cleaning: ['cleaning', 'clean', 'care', 'repair'],
}

function normalize(input: string) {
  const map: Record<string, string> = {
    ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
    Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
  }

  return input
    .split('')
    .map((char) => map[char] ?? char)
    .join('')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\p{Diacritic}]+/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenVariants(token: string) {
  const variants = new Set<string>([token])
  variants.add(token.replace(/(leri|lari|lar|ler)$/, ''))
  variants.add(token.replace(/(si|su)$/, ''))
  variants.add(token.replace(/(i|u|a|e)$/, ''))
  return [...variants].filter((value) => value.length >= 3)
}

function tokens(text: string) {
  return normalize(text)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
}

function parseImages(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
  } catch {
    return []
  }
}

export type BlogCoverMatch = {
  image: string
  productName: string
  score: number
}

export async function findBlogCover(input: {
  title: string
  excerpt?: string | null
  keywords?: string | null
  excludeImages?: string[]
}): Promise<BlogCoverMatch | null> {
  const postTokens = new Set(tokens(`${input.title} ${input.excerpt || ''} ${input.keywords || ''}`))
  if (postTokens.size === 0) return null

  const expanded = new Set<string>()
  for (const token of postTokens) {
    for (const variant of tokenVariants(token)) expanded.add(variant)
    for (const synonym of SYNONYMS[token] || []) expanded.add(synonym)
  }

  const excluded = new Set(input.excludeImages || [])

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', images: { not: null } },
    take: 400,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      images: true,
      translations: { select: { locale: true, name: true, description: true } },
      category: {
        select: {
          name: true,
          translations: { select: { locale: true, name: true } },
        },
      },
    },
  })

  let best: BlogCoverMatch | null = null

  for (const product of products) {
    const images = parseImages(product.images)
    if (images.length === 0) continue

    const image = images[0]
    if (excluded.has(image)) continue

    const nameText = normalize(
      [
        product.name,
        ...product.translations.map((translation) => translation.name),
      ].join(' ')
    )
    const categoryText = normalize(
      [
        product.category?.name || '',
        ...(product.category?.translations || []).map((translation) => translation.name),
      ].join(' ')
    )
    const descriptionText = normalize(
      [
        product.description,
        ...product.translations.map((translation) => translation.description),
      ].join(' ')
    )

    let score = 0
    for (const token of expanded) {
      if (nameText.includes(token)) score += 4
      if (categoryText.includes(token)) score += 6
      if (descriptionText.includes(token)) score += 1
    }

    if (score < 4) continue
    if (!best || score > best.score) {
      best = { image, productName: product.name, score }
    }
  }

  return best
}

export async function pickBlogCoverImage(input: {
  title: string
  excerpt?: string | null
  keywords?: string | null
  excludeImages?: string[]
}): Promise<string | null> {
  const match = await findBlogCover(input)
  return match?.image || null
}
