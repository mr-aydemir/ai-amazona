import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const originEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL
    const origin = originEnv || `${url.protocol}//${url.host}`

    // Supported locales
    const locales = ['tr', 'en']

    // Fetch dynamic entities
    const [products, categories, productTranslations, categoryTranslations] = await Promise.all([
      prisma.product.findMany({ select: { id: true, slug: true, updatedAt: true } }),
      prisma.category.findMany({ select: { id: true, slug: true, updatedAt: true } }),
      prisma.productTranslation.findMany({ select: { productId: true, locale: true, slug: true } }),
      prisma.categoryTranslation.findMany({ select: { categoryId: true, locale: true, slug: true } }),
    ])

    // Build map: productId -> { [locale]: slug }
    const translationMap: Record<string, Record<string, string>> = {}
    for (const tr of productTranslations) {
      const pid = String(tr.productId)
      const loc = (tr.locale || '').split('-')[0]
      if (!translationMap[pid]) translationMap[pid] = {}
      if (tr.slug) translationMap[pid][loc] = tr.slug
    }

    // Build map: categoryId -> { [locale]: slug }
    const categoryTranslationMap: Record<string, Record<string, string>> = {}
    for (const tr of categoryTranslations) {
      const cid = String(tr.categoryId)
      const loc = (tr.locale || '').split('-')[0]
      if (!categoryTranslationMap[cid]) categoryTranslationMap[cid] = {}
      if (tr.slug) categoryTranslationMap[cid][loc] = tr.slug
    }

    const staticPaths = [
      '', // home
      '/products',
      '/contact',
      '/faqs',
      '/distance-sales',
      '/return-policy',
      '/about',
      '/privacy',
      '/cookies',
      '/terms',
    ]

    const pages: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[] = []

    // Static localized pages
    for (const locale of locales) {
      for (const p of staticPaths) {
        const loc = buildUrl(origin, `/${locale}${p}`)
        pages.push({ loc, changefreq: 'weekly', priority: p === '' ? '1.0' : '0.7' })
      }
    }

    // Product detail pages per locale using translation-based slugs, with fallbacks
    for (const product of products) {
      const pid = String(product.id)
      for (const locale of locales) {
        const localizedSlug = translationMap[pid]?.[locale]
        const segment = localizedSlug || product.slug || pid
        pages.push({
          loc: buildUrl(origin, `/${locale}/products/${segment}`),
          lastmod: product.updatedAt?.toISOString?.() || undefined,
          changefreq: 'daily',
          priority: '0.8',
        })
      }
    }

    // Category listing pages per locale using translation-based slugs, with fallbacks
    for (const category of categories) {
      const cid = String(category.id)
      for (const locale of locales) {
        const localizedSlug = categoryTranslationMap[cid]?.[locale]
        const segment = localizedSlug || category.slug || cid
        pages.push({
          loc: buildUrl(origin, `/${locale}/products?category=${encodeURIComponent(segment)}`),
          lastmod: category.updatedAt?.toISOString?.() || undefined,
          changefreq: 'weekly',
          priority: '0.6',
        })
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      pages.map(p => {
        return `\n  <url>` +
          `\n    <loc>${xmlEscape(p.loc)}</loc>` +
          (p.lastmod ? `\n    <lastmod>${xmlEscape(p.lastmod)}</lastmod>` : '') +
          (p.changefreq ? `\n    <changefreq>${p.changefreq}</changefreq>` : '') +
          (p.priority ? `\n    <priority>${p.priority}</priority>` : '') +
          `\n  </url>`
      }).join('') +
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