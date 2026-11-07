import { slugify } from '@/lib/slugify'

export type AiLocale = 'tr' | 'en'
export type AiBlogInput = { topic: string; keywords?: string }

export type ClientBlogDraft = {
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  metaTitle: string
  metaDescription: string
  model: string
}

export const CLIENT_MODELS = [
  'nvidia/nemotron-3.5-super-vl:free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'dots-studio/dots-3-note-preview:free',
]

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

function userPrompt(locale: AiLocale, input: AiBlogInput) {
  const isEn = locale === 'en'
  const lines = isEn
    ? [
        'Write a blog post in English.',
        `Topic: ${input.topic}`,
        input.keywords ? `Target keywords: ${input.keywords}` : '',
        '',
        'Requirements:',
        '- 500-700 words.',
        '- Use HTML only: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <br>. No <h1>, no markdown, no scripts.',
        '- Start with a short introductory paragraph.',
        '- Use at least 3 H2 sections and short paragraphs.',
        '- Include at least 2 internal links to https://www.hivhestin.com/en/products.',
        '- Do not invent product dimensions, materials, prices or delivery times.',
        '- Do not mention that the text was AI generated.',
        '',
        'Return JSON with exactly these string fields:',
        '{"title":"...","excerpt":"...","contentHtml":"...","metaTitle":"...","metaDescription":"..."}',
        'metaTitle max 60 chars, metaDescription max 155 chars, excerpt 120-180 chars.',
      ]
    : [
        'Yazıyı Türkçe yaz.',
        `Konu: ${input.topic}`,
        input.keywords ? `Hedef anahtar kelimeler: ${input.keywords}` : '',
        '',
        'Kurallar:',
        '- 500-700 kelime.',
        '- Yalnızca şu HTML etiketlerini kullan: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <br>. <h1>, markdown, script yok.',
        '- Kısa bir giriş paragrafıyla başla.',
        '- En az 3 adet H2 bölümü ve kısa paragraflar kullan.',
        '- En az 2 iç link ekle: https://www.hivhestin.com/tr/products',
        '- Ürün ölçüsü, malzemesi, fiyatı veya teslimat süresi uydurma.',
        '- Metnin yapay zeka ile üretildiğinden bahsetme.',
        '',
        'Tam olarak şu string alanlardan oluşan JSON döndür:',
        '{"title":"...","excerpt":"...","contentHtml":"...","metaTitle":"...","metaDescription":"..."}',
        'metaTitle en fazla 60, metaDescription en fazla 155, excerpt 120-180 karakter olsun.',
      ]

  return lines.filter(Boolean).join('\n')
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

  throw new Error('Model yanıtı JSON olarak çözümlenemedi.')
}

function cleanText(value: unknown, max: number) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function parseDraft(raw: string, model: string): ClientBlogDraft {
  const data = extractJson(raw)
  const title = cleanText(data?.title, 160)
  const contentHtml = String(data?.contentHtml || '').trim()

  if (!title) throw new Error('Model başlık üretmedi.')
  if (contentHtml.replace(/<[^>]*>/g, '').trim().length < 400) {
    throw new Error('Üretilen içerik çok kısa.')
  }

  const plain = contentHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const excerpt = cleanText(data?.excerpt, 240) || plain.slice(0, 180)

  return {
    title,
    slug: slugify(title),
    excerpt,
    contentHtml,
    metaTitle: cleanText(data?.metaTitle, 60) || title.slice(0, 60),
    metaDescription: cleanText(data?.metaDescription, 155) || excerpt.slice(0, 155),
    model,
  }
}

export type AiProxyConfig = {
  proxyUrl: string
  token?: string
}

export async function generateBlogDraftClient(
  locale: AiLocale,
  input: AiBlogInput,
  config: AiProxyConfig
): Promise<ClientBlogDraft> {
  const proxyUrl = config.proxyUrl.trim().replace(/\/$/, '')
  if (!proxyUrl) {
    throw new Error('AI proxy adresi tanımlı değil. NEXT_PUBLIC_AI_PROXY_URL ekleyin.')
  }

  const errors: string[] = []
  const deadline = Date.now() + 45000

  for (const model of CLIENT_MODELS) {
    const remaining = deadline - Date.now()
    if (remaining < 3000) break

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), Math.min(20000, remaining))

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.token ? { 'X-Proxy-Token': config.token } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt(locale) },
            { role: 'user', content: userPrompt(locale, input) },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(`(${response.status}) ${detail.slice(0, 240)}`.trim())
      }

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('Model boş yanıt döndü.')
      }

      return parseDraft(content, model)
    } catch (error) {
      const message =
        (error as any)?.name === 'AbortError'
          ? 'zaman aşımı'
          : (error as Error)?.message || 'istek hatası'
      errors.push(`${model}: ${message}`)
      console.error('[AI_MODEL_CLIENT_FAIL]', model, message)
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new Error(`Tüm ücretsiz modeller başarısız oldu. ${errors.join(' | ').slice(0, 700)}`)
}
