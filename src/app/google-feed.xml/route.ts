import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function xmlEscape(s: any) {
  const str = typeof s === 'string' ? s : (s == null ? '' : String(s))
  return str.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] as string))
}

function buildUrl(origin: string, path: string) {
  return `${origin.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`
}

function resolveImageLink(raw: any, origin: string): string {
  if (!raw) return ''
  const val = typeof raw === 'string' ? raw : (raw?.url || raw?.src || '')
  if (!val) return ''
  if (/^https?:\/\//i.test(val)) return val
  return buildUrl(origin, val)
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const originEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL
    const origin = originEnv || `${url.protocol}//${url.host}`

    const locales = ['tr', 'en']

    const [system, products, productTranslations] = await Promise.all([
      prisma.systemSetting.findFirst({ select: { baseCurrency: true } }),
      prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, slug: true, name: true, description: true, price: true, stock: true, images: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.productTranslation.findMany({ select: { productId: true, locale: true, name: true, description: true, slug: true } }),
    ])

    const mapByLocale: Record<string, Record<string, { name?: string; description?: string; slug?: string }>> = {}
    for (const loc of locales) mapByLocale[loc] = {}
    for (const tr of productTranslations) {
      const loc = (tr.locale || '').split('-')[0]
      if (!locales.includes(loc)) continue
      const pid = String(tr.productId)
      mapByLocale[loc][pid] = mapByLocale[loc][pid] || {}
      if (tr.name) mapByLocale[loc][pid].name = tr.name
      if (tr.description) mapByLocale[loc][pid].description = tr.description
      if (tr.slug) mapByLocale[loc][pid].slug = tr.slug
    }

    const currency = system?.baseCurrency || 'TRY'

    const itemsXml = locales.map((loc) => {
      return products.map((p) => {
        let images: string[] = []
        try {
          images = Array.isArray((p as any).images) ? (p as any).images : JSON.parse((p as any).images || '[]')
        } catch { images = [] }
        const pid = String(p.id)
        const t = mapByLocale[loc][pid] || {}
        const title = t.name || p.name
        const desc = t.description || p.description
        const slug = t.slug || p.slug || pid
        const link = buildUrl(origin, `/${loc}/products/${slug}`)
        const first = Array.isArray(images) ? images[0] : undefined
        const image = resolveImageLink(first, origin)
        const availability = (p.stock ?? 0) > 0 ? 'in stock' : 'out of stock'
        const price = `${Number(p.price).toFixed(2)} ${currency}`
        return (
          `  <item>` +
          `\n    <g:id>${xmlEscape(`${pid}-${loc}`)}</g:id>` +
          `\n    <g:title>${xmlEscape(title)}</g:title>` +
          `\n    <g:description>${xmlEscape(desc)}</g:description>` +
          `\n    <g:link>${xmlEscape(link)}</g:link>` +
          (image ? `\n    <g:image_link>${xmlEscape(image)}</g:image_link>` : '') +
          `\n    <g:availability>${availability}</g:availability>` +
          `\n    <g:price>${price}</g:price>` +
          `\n  </item>`
        )
      }).join('\n')
    }).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
      `<channel>\n` +
      `  <title>${xmlEscape('Products Feed (tr+en)')}</title>\n` +
      `  <link>${xmlEscape(origin)}</link>\n` +
      `  <description>${xmlEscape('Google Merchant Feed (multi-locale)')}</description>\n` +
      `${itemsXml}\n` +
      `</channel>\n` +
      `</rss>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=1800, max-age=1800',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to build google-feed.xml' }, { status: 500 })
  }
}
