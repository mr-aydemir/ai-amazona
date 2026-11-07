import { sanitizeRichHtml, sanitizeText } from '@/lib/sanitize-html'
import { slugify } from '@/lib/slugify'

export type AiLocale = 'tr' | 'en'

export type AiBlogInput = {
  topic: string
  keywords?: string
}

export type AiBlogContext = {
  categories: string[]
  products: string[]
}

export type GeneratedBlogDraft = {
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  metaTitle: string
  metaDescription: string
}

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

export class AiBlogError extends Error {}

export function getAiConfig() {
  const apiKey =
    process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || ''
  const baseUrl = (
    process.env.AI_BASE_URL ||
    process.env.OPENROUTER_BASE_URL ||
    (process.env.OPENAI_API_KEY ? 'https://api.openai.com/v1' : DEFAULT_BASE_URL)
  ).replace(/\/$/, '')
  const model =
    process.env.AI_MODEL ||
    process.env.OPENROUTER_MODEL ||
    process.env.OPENAI_MODEL ||
    DEFAULT_MODEL

  return { apiKey, baseUrl, model }
}

export function isAiConfigured() {
  return Boolean(getAiConfig().apiKey)
}

function systemPrompt(locale: AiLocale) {
  if (locale === 'en') {
    return [
      'You write SEO-friendly blog posts for Hivhestın, a Turkish e-commerce store selling 3D printed products.',
      'Be helpful, specific and factual. Never invent statistics, sources, guarantees or product specifications.',
      'Do not use aggressive sales language. Write like a practical buying guide.',
      'Return ONLY valid JSON. Do not wrap it in markdown fences.',
    ].join(' ')
  }
  return [
    'Hivhestın (3D baskı ürünleri satan Türkçe e-ticaret sitesi) için SEO odaklı blog yazıları yazıyorsun.',
    'Yardımcı, somut ve gerçekçi ol. Uydurma istatistik, kaynak, garanti veya ürün özelliği yazma.',
    'Agresif satış dili kullanma; pratik bir satın alma rehberi gibi yaz.',
    'SADECE geçerli JSON döndür. Markdown kod bloğu kullanma.',
  ].join(' ')
}

function userPrompt(locale: AiLocale, input: AiBlogInput, context: AiBlogContext) {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://www.hivhestin.com'
  ).replace(/\/$/, '')
  const langName = locale === 'en' ? 'English' : 'Turkish'
  const categoryLine = context.categories.length
    ? context.categories.join(', ')
    : locale === 'en'
      ? '3D printing, home decor, personalized gifts'
      : '3D baskı, ev dekorasyonu, kişiye özel hediyeler'
  const productLine = context.products.length
    ? context.products.join(' | ')
    : locale === 'en'
      ? 'No specific products'
      : 'Belirli ürün yok'

  if (locale === 'en') {
    return [
      `Write a blog post in ${langName}.`,
      `Topic: ${input.topic}`,
      input.keywords ? `Target keywords: ${input.keywords}` : '',
      `Categories to reference: ${categoryLine}`,
      `Products to mention (only use facts present here): ${productLine}`,
      '',
      'Requirements:',
      '- 500-700 words.',
      '- Use HTML only: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <br>. No <h1>, no markdown, no scripts.',
      '- Start with a short introductory paragraph (no heading).',
      '- Use at least 3 H2 sections and short paragraphs.',
      '- Include at least 2 internal links using absolute URLs to the site, e.g. ' +
        `${siteUrl}/en/products or ${siteUrl}/en/products?category=...`,
      '- Do not invent product dimensions, materials, prices or delivery times.',
      '- Do not mention that the text was AI generated.',
      '',
      'Return JSON with exactly these string fields:',
      '{"title":"...","excerpt":"...","contentHtml":"...","metaTitle":"...","metaDescription":"..."}',
      'metaTitle max 60 chars, metaDescription max 155 chars, excerpt 120-180 chars.',
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    `Yazıyı ${langName} dilinde yaz.`,
    `Konu: ${input.topic}`,
    input.keywords ? `Hedef anahtar kelimeler: ${input.keywords}` : '',
    `Referans verilecek kategoriler: ${categoryLine}`,
    `Bahsedilecek ürünler (yalnızca burada verilen bilgileri kullan): ${productLine}`,
    '',
    'Kurallar:',
    '- 500-700 kelime.',
    '- Yalnızca şu HTML etiketlerini kullan: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <br>. <h1>, markdown, script yok.',
    '- Kısa bir giriş paragrafıyla başla (başlık kullanma).',
    '- En az 3 adet H2 bölümü ve kısa paragraflar kullan.',
    '- En az 2 iç link ekle; siteye tam URL ile, örn. ' +
      `${siteUrl}/tr/products veya ${siteUrl}/tr/products?category=...`,
    '- Ürün ölçüsü, malzemesi, fiyatı veya teslimat süresi uydurma.',
    '- Metnin yapay zeka ile üretildiğinden bahsetme.',
    '',
    'Tam olarak şu string alanlardan oluşan JSON döndür:',
    '{"title":"...","excerpt":"...","contentHtml":"...","metaTitle":"...","metaDescription":"..."}',
    'metaTitle en fazla 60, metaDescription en fazla 155, excerpt 120-180 karakter olsun.',
  ]
    .filter(Boolean)
    .join('\n')
}

function extractJson(text: string): any {
  let value = text.trim()
  value = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  try {
    return JSON.parse(value)
  } catch {
    const start = value.indexOf('{')
    const end = value.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(value.slice(start, end + 1))
      } catch {
        // fall through
      }
    }
  }

  throw new AiBlogError('Model yanıtı JSON olarak çözümlenemedi.')
}

async function callModel(messages: Array<{ role: string; content: string }>): Promise<string> {
  const { apiKey, baseUrl, model } = getAiConfig()
  if (!apiKey) {
    throw new AiBlogError(
      'AI API anahtarı tanımlı değil. Sunucu ortamına OPENROUTER_API_KEY (veya AI_API_KEY) ekleyin.'
    )
  }

  const controller = new AbortController()
  // Stay below the serverless platform's function timeout so the user gets a
  // clear message instead of a gateway error.
  const timeout = setTimeout(() => controller.abort(), 55000)

  const send = async (withJsonMode: boolean) => {
    const payload: Record<string, any> = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }
    if (withJsonMode) payload.response_format = { type: 'json_object' }

    return fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hivhestin.com',
        'X-Title': 'Hivhestin Blog',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    })
  }

  try {
    let response = await send(true)
    if (!response.ok) {
      // Some free models reject response_format; retry without it.
      response = await send(false)
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new AiBlogError(
        `Model isteği başarısız (${response.status}). ${detail.slice(0, 300)}`.trim()
      )
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      throw new AiBlogError('Model boş yanıt döndü.')
    }
    return content
  } catch (error) {
    if (error instanceof AiBlogError) throw error
    if ((error as any)?.name === 'AbortError') {
      throw new AiBlogError('Model yanıtı zaman aşımına uğradı.')
    }
    throw new AiBlogError((error as Error)?.message || 'Model isteği başarısız.')
  } finally {
    clearTimeout(timeout)
  }
}

function cleanText(value: unknown, max: number) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export async function generateBlogDraft(
  locale: AiLocale,
  input: AiBlogInput,
  context: AiBlogContext
): Promise<GeneratedBlogDraft> {
  const raw = await callModel([
    { role: 'system', content: systemPrompt(locale) },
    { role: 'user', content: userPrompt(locale, input, context) },
  ])

  const data = extractJson(raw)
  const title = cleanText(data?.title, 160)
  const contentHtml = sanitizeRichHtml(typeof data?.contentHtml === 'string' ? data.contentHtml : '')

  if (!title) throw new AiBlogError('Model başlık üretmedi.')
  if (contentHtml.replace(/<[^>]*>/g, '').trim().length < 400) {
    throw new AiBlogError('Üretilen içerik çok kısa.')
  }

  const excerpt =
    cleanText(data?.excerpt, 240) ||
    sanitizeText(contentHtml).replace(/\s+/g, ' ').trim().slice(0, 180)

  return {
    title,
    slug: slugify(title),
    excerpt,
    contentHtml,
    metaTitle: cleanText(data?.metaTitle, 60) || title.slice(0, 60),
    metaDescription: cleanText(data?.metaDescription, 155) || excerpt.slice(0, 155),
  }
}
