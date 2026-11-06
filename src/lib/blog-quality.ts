export type QualityStatus = 'pass' | 'warn' | 'fail'

export type QualityCheck = {
  id: string
  label: string
  status: QualityStatus
  detail: string
}

export type QualityResult = {
  score: number
  level: QualityStatus
  wordCount: number
  checks: QualityCheck[]
}

export type QualityInput = {
  title: string
  excerpt: string
  contentHtml: string
  metaTitle?: string | null
  metaDescription?: string | null
  existing?: Array<{ id?: string; title: string; contentHtml: string }>
}

const STOPWORDS = new Set(
  [
    've', 'bir', 'bu', 'da', 'de', 'için', 'ile', 'en', 'çok', 'daha', 'gibi', 'olan', 'olarak',
    'veya', 'ama', 'fakat', 'kadar', 'sonra', 'önce', 'her', 'hem', 'ne', 'nasıl', 'neden',
    'hangi', 'mi', 'mı', 'mu', 'mü', 'şu', 'o', 'ben', 'sen', 'biz', 'siz', 'onlar', 'var',
    'yok', 'ise', 'ancak', 'üzere', 'göre', 'sadece', 'tüm', 'bütün', 'şey', 'kendi', 'olur',
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'were', 'you', 'your',
    'our', 'their', 'have', 'has', 'not', 'but', 'can', 'will', 'how', 'what', 'when', 'why',
    'into', 'about', 'more', 'most', 'than', 'then', 'they', 'them', 'its', 'a', 'an', 'of',
    'to', 'in', 'on', 'at', 'as', 'by', 'or', 'is', 'be',
  ]
)

function stripHtml(html: string) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string) {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []
}

function meaningfulTokens(text: string) {
  return tokenize(text).filter((token) => token.length > 2 && !STOPWORDS.has(token))
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const value of a) {
    if (b.has(value)) intersection++
  }
  return intersection / (a.size + b.size - intersection)
}

function shingles(words: string[], size = 5) {
  const set = new Set<string>()
  for (let i = 0; i + size <= words.length; i++) {
    set.add(words.slice(i, i + size).join(' '))
  }
  return set
}

function check(id: string, label: string, status: QualityStatus, detail: string): QualityCheck {
  return { id, label, status, detail }
}

function countInternalLinks(html: string) {
  const matches = String(html || '').match(/href=["']([^"']+)["']/gi) || []
  let count = 0
  for (const match of matches) {
    const href = match.replace(/^href=["']/i, '').replace(/["']$/, '').trim()
    if (href.startsWith('/') || href.includes('hivhestin.com')) count++
  }
  return count
}

function duplicateParagraphRatio(html: string) {
  const paragraphs = String(html || '')
    .split(/<\/(?:p|h[1-6]|li|blockquote|div)>/i)
    .map((part) => stripHtml(part).toLowerCase())
    .filter((part) => part.length >= 60)

  if (paragraphs.length === 0) return 0
  const counts = new Map<string, number>()
  for (const paragraph of paragraphs) {
    counts.set(paragraph, (counts.get(paragraph) || 0) + 1)
  }
  let duplicated = 0
  for (const count of counts.values()) {
    if (count > 1) duplicated += count - 1
  }
  return duplicated / paragraphs.length
}

export function analyzeBlogQuality(input: QualityInput): QualityResult {
  const text = stripHtml(input.contentHtml)
  const words = tokenize(text)
  const wordCount = words.length
  const checks: QualityCheck[] = []

  checks.push(
    wordCount >= 400
      ? check('content-length', 'İçerik uzunluğu', 'pass', `${wordCount} kelime`)
      : wordCount >= 250
        ? check('content-length', 'İçerik uzunluğu', 'warn', `${wordCount} kelime (400+ önerilir)`)
        : check('content-length', 'İçerik uzunluğu', 'fail', `${wordCount} kelime (en az 250 gerekli)`)
  )

  const h2Count = (String(input.contentHtml).match(/<h2\b/gi) || []).length
  checks.push(
    h2Count >= 2
      ? check('headings', 'Başlık yapısı', 'pass', `${h2Count} H2 bölümü`)
      : h2Count === 1
        ? check('headings', 'Başlık yapısı', 'warn', 'Yalnızca 1 H2 var, 2+ önerilir')
        : check('headings', 'Başlık yapısı', 'fail', 'H2 bölümü yok')
  )

  const linkCount = countInternalLinks(input.contentHtml)
  checks.push(
    linkCount >= 2
      ? check('internal-links', 'İç linkler', 'pass', `${linkCount} iç link`)
      : linkCount === 1
        ? check('internal-links', 'İç linkler', 'warn', 'Yalnızca 1 iç link var, 2+ önerilir')
        : check('internal-links', 'İç linkler', 'fail', 'İç link yok')
  )

  const titleLength = stripHtml(input.title).length
  checks.push(
    titleLength >= 30 && titleLength <= 70
      ? check('title-length', 'Başlık uzunluğu', 'pass', `${titleLength} karakter`)
      : titleLength < 30
        ? check('title-length', 'Başlık uzunluğu', 'warn', `${titleLength} karakter (30-70 önerilir)`)
        : check('title-length', 'Başlık uzunluğu', 'warn', `${titleLength} karakter (70'i aşıyor)`)
  )

  const metaTitleLength = stripHtml(input.metaTitle || '').length
  checks.push(
    metaTitleLength === 0
      ? check('meta-title', 'Meta başlık', 'fail', 'Meta başlık boş')
      : metaTitleLength >= 30 && metaTitleLength <= 60
        ? check('meta-title', 'Meta başlık', 'pass', `${metaTitleLength} karakter`)
        : check('meta-title', 'Meta başlık', 'warn', `${metaTitleLength} karakter (30-60 önerilir)`)
  )

  const metaDescriptionLength = stripHtml(input.metaDescription || '').length
  checks.push(
    metaDescriptionLength === 0
      ? check('meta-description', 'Meta açıklama', 'fail', 'Meta açıklama boş')
      : metaDescriptionLength >= 120 && metaDescriptionLength <= 160
        ? check('meta-description', 'Meta açıklama', 'pass', `${metaDescriptionLength} karakter`)
        : metaDescriptionLength < 80 || metaDescriptionLength > 180
          ? check('meta-description', 'Meta açıklama', 'fail', `${metaDescriptionLength} karakter (120-160 önerilir)`)
          : check('meta-description', 'Meta açıklama', 'warn', `${metaDescriptionLength} karakter (120-160 önerilir)`)
  )

  const excerptLength = stripHtml(input.excerpt).length
  checks.push(
    excerptLength === 0
      ? check('excerpt', 'Özet', 'fail', 'Özet boş')
      : excerptLength >= 100 && excerptLength <= 220
        ? check('excerpt', 'Özet', 'pass', `${excerptLength} karakter`)
        : excerptLength < 50
          ? check('excerpt', 'Özet', 'fail', `${excerptLength} karakter (çok kısa)`)
          : check('excerpt', 'Özet', 'warn', `${excerptLength} karakter (100-220 önerilir)`)
  )

  const placeholderPattern =
    /(lorem ipsum|\{\{|\[yer tutucu\]|todo:|as an ai|i'?m sorry|yapay zeka tarafından|ben bir yapay zeka)/i
  checks.push(
    placeholderPattern.test(`${input.title} ${input.excerpt} ${input.contentHtml}`)
      ? check('placeholders', 'Şablon/artık metin', 'fail', 'Şablon veya model artığı ifade bulundu')
      : check('placeholders', 'Şablon/artık metin', 'pass', 'Temiz')
  )

  const existing = (input.existing || []).filter((post) => post.title && post.contentHtml)
  let maxTitleSimilarity = 0
  let maxContentSimilarity = 0
  const incomingTitleTokens = new Set(meaningfulTokens(input.title))
  const incomingShingles = shingles(tokenize(text).slice(0, 1200))

  for (const post of existing) {
    const titleSim = jaccard(incomingTitleTokens, new Set(meaningfulTokens(post.title)))
    if (titleSim > maxTitleSimilarity) maxTitleSimilarity = titleSim

    const contentSim = jaccard(incomingShingles, shingles(tokenize(stripHtml(post.contentHtml)).slice(0, 1200)))
    if (contentSim > maxContentSimilarity) maxContentSimilarity = contentSim
  }

  checks.push(
    maxTitleSimilarity >= 0.8
      ? check('duplicate-title', 'Başlık benzerliği', 'fail', `Mevcut bir yazıyla %${Math.round(maxTitleSimilarity * 100)} benzer`)
      : maxTitleSimilarity >= 0.6
        ? check('duplicate-title', 'Başlık benzerliği', 'warn', `Mevcut bir yazıyla %${Math.round(maxTitleSimilarity * 100)} benzer`)
        : check('duplicate-title', 'Başlık benzerliği', 'pass', 'Belirgin bir tekrar yok')
  )

  checks.push(
    maxContentSimilarity >= 0.35
      ? check('duplicate-content', 'İçerik tekrarı', 'fail', `Mevcut bir yazıyla %${Math.round(maxContentSimilarity * 100)} örtüşüyor`)
      : maxContentSimilarity >= 0.2
        ? check('duplicate-content', 'İçerik tekrarı', 'warn', `Mevcut bir yazıyla %${Math.round(maxContentSimilarity * 100)} örtüşüyor`)
        : check('duplicate-content', 'İçerik tekrarı', 'pass', 'Belirgin bir tekrar yok')
  )

  const repetition = duplicateParagraphRatio(input.contentHtml)
  checks.push(
    repetition >= 0.3
      ? check('repetition', 'Paragraf tekrarı', 'fail', `Paragrafların %${Math.round(repetition * 100)}'i tekrar`)
      : repetition >= 0.15
        ? check('repetition', 'Paragraf tekrarı', 'warn', `Paragrafların %${Math.round(repetition * 100)}'i tekrar`)
        : check('repetition', 'Paragraf tekrarı', 'pass', 'Tekrar yok')
  )

  const frequency = new Map<string, number>()
  for (const token of words) {
    if (token.length < 4 || STOPWORDS.has(token)) continue
    frequency.set(token, (frequency.get(token) || 0) + 1)
  }
  let topToken = ''
  let topFrequency = 0
  for (const [token, count] of frequency) {
    if (count > topFrequency) {
      topToken = token
      topFrequency = count
    }
  }
  const stuffingRatio = wordCount > 0 ? topFrequency / wordCount : 0
  checks.push(
    stuffingRatio >= 0.08
      ? check('keyword-stuffing', 'Anahtar kelime yoğunluğu', 'fail', `"${topToken}" %${Math.round(stuffingRatio * 100)} tekrar ediyor`)
      : stuffingRatio >= 0.05
        ? check('keyword-stuffing', 'Anahtar kelime yoğunluğu', 'warn', `"${topToken}" %${Math.round(stuffingRatio * 100)} tekrar ediyor`)
        : check('keyword-stuffing', 'Anahtar kelime yoğunluğu', 'pass', 'Dengeli')
  )

  const failCount = checks.filter((item) => item.status === 'fail').length
  const warnCount = checks.filter((item) => item.status === 'warn').length
  const score = Math.max(0, Math.min(100, 100 - failCount * 20 - warnCount * 7))
  const level: QualityStatus = failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass'

  return { score, level, wordCount, checks }
}
