import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getPublishedBlogSitemapEntries } from '@/lib/blog-seo'

export const runtime = 'nodejs'

type SitemapEntry = {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: string
  alternates?: Record<string, string>
  images?: string[]
}

function xmlEscape(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildUrl(origin: string, path: string) {
  return `${origin.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`
}

function parseImages(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 3)
  } catch {
    return []
  }
}

function renderEntry(entry: SitemapEntry) {
  const alternates = entry.alternates
    ? Object.entries(entry.alternates)
        .map(
          ([hreflang, href]) =>
            `\n    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${xmlEscape(href)}"/>`
        )
        .join('')
    : ''

  const images = entry.images?.length
    ? entry.images
        .map((src) => `\n    <image:image><image:loc>${xmlEscape(src)}</image:loc></image:image>`)
        .join('')
    : ''

  return (
    `\n  <url>` +
    `\n    <loc>${xmlEscape(entry.loc)}</loc>` +
    (entry.lastmod ? `\n    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : '') +
    (entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : '') +
    (entry.priority ? `\n    <priority>${entry.priority}</priority>` : '') +
    alternates +
    images +
    `\n  </url>`
  )
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const originEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL
    const origin = (originEnv || `${url.protocol}//${url.host}`).replace(/\/$/, '')

    const locales = ['tr', 'en'] as const

    const [products, categories, productTranslations, categoryTranslations] = await Promise.all([
      prisma.product.findMany({
        where: { status: 'ACTIVE', price: { gt: 0 } },
        select: { id: true, slug: true, updatedAt: true, images: true },
      }),
      prisma.category.findMany({
        where: { products: { some: { status: 'ACTIVE', price: { gt: 0 } } } },
        select: { id: true, slug: true, updatedAt: true },
      }),
      prisma.productTranslation.findMany({
        where: { locale: { in: [...locales] } },
        select: { productId: true, locale: true, slug: true },
      }),
      prisma.categoryTranslation.findMany({
        where: { locale: { in: [...locales] } },
        select: { categoryId: true, locale: true, slug: true },
      }),
    ])

    const productSlugs = new Map<string, Record<string, string>>()
    for (const tr of productTranslations) {
      const pid = String(tr.productId)
      const loc = (tr.locale || '').split('-')[0]
      if (!tr.slug) continue
      if (!productSlugs.has(pid)) productSlugs.set(pid, {})
      productSlugs.get(pid)![loc] = tr.slug
    }

    const categorySlugs = new Map<string, Record<string, string>>()
    for (const tr of categoryTranslations) {
      const cid = String(tr.categoryId)
      const loc = (tr.locale || '').split('-')[0]
      if (!tr.slug) continue
      if (!categorySlugs.has(cid)) categorySlugs.set(cid, {})
      categorySlugs.get(cid)![loc] = tr.slug
    }

    const pages: SitemapEntry[] = []

    const staticPaths = [
      '',
      '/products',
      '/contact',
      '/faqs',
      '/distance-sales',
      '/return-policy',
      '/shipping-delivery',
      '/about',
      '/privacy',
      '/cookies',
      '/terms',
    ]

    for (const path of staticPaths) {
      const alternates = {
        tr: buildUrl(origin, `/tr${path}`),
        en: buildUrl(origin, `/en${path}`),
        'x-default': buildUrl(origin, `/tr${path}`),
      }
      for (const locale of locales) {
        pages.push({
          loc: alternates[locale],
          changefreq: 'weekly',
          priority: path === '' ? '1.0' : '0.7',
          alternates,
        })
      }
    }

    for (const product of products) {
      const pid = String(product.id)
      const slugs = productSlugs.get(pid) || {}
      const altTr = buildUrl(origin, `/tr/products/${slugs.tr || product.slug || pid}`)
      const altEn = buildUrl(origin, `/en/products/${slugs.en || slugs.tr || product.slug || pid}`)
      const alternates = { tr: altTr, en: altEn, 'x-default': altTr }
      const images = parseImages(product.images)
      const lastmod = product.updatedAt?.toISOString?.()

      pages.push({ loc: altTr, lastmod, changefreq: 'daily', priority: '0.8', alternates, images })
      pages.push({ loc: altEn, lastmod, changefreq: 'daily', priority: '0.8', alternates, images })
    }

    for (const category of categories) {
      const cid = String(category.id)
      const slugs = categorySlugs.get(cid) || {}
      const segTr = slugs.tr || category.slug || cid
      const segEn = slugs.en || segTr
      const altTr = buildUrl(origin, `/tr/products?category=${encodeURIComponent(segTr)}`)
      const altEn = buildUrl(origin, `/en/products?category=${encodeURIComponent(segEn)}`)
      const alternates = { tr: altTr, en: altEn, 'x-default': altTr }
      const lastmod = category.updatedAt?.toISOString?.()

      pages.push({ loc: altTr, lastmod, changefreq: 'weekly', priority: '0.6', alternates })
      pages.push({ loc: altEn, lastmod, changefreq: 'weekly', priority: '0.6', alternates })
    }

    try {
      const blogPages = await getPublishedBlogSitemapEntries(origin)
      pages.push(...blogPages)
    } catch (error) {
      console.error('[SITEMAP_BLOG_ENTRIES_ERROR]', error)
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"` +
      ` xmlns:xhtml="http://www.w3.org/1999/xhtml"` +
      ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">` +
      pages.map(renderEntry).join('') +
      `\n</urlset>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, max-age=3600',
      },
    })
  } catch (e) {
    console.error('[SITEMAP_XML_ERROR]', e)
    return NextResponse.json({ error: 'Failed to build sitemap.xml' }, { status: 500 })
  }
}
