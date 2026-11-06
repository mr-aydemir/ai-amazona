import prisma from '@/lib/prisma'

export type BlogSitemapEntry = {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: string
  alternates: Record<string, string>
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '')
}

export async function getPublishedBlogSitemapEntries(origin: string): Promise<BlogSitemapEntry[]> {
  const base = normalizeOrigin(origin)

  const entries: BlogSitemapEntry[] = []
  const listAlternates: Record<string, string> = {
    tr: `${base}/tr/blog`,
    en: `${base}/en/blog`,
    'x-default': `${base}/tr/blog`,
  }
  for (const locale of ['tr', 'en']) {
    entries.push({
      loc: `${base}/${locale}/blog`,
      changefreq: 'weekly',
      priority: '0.5',
      alternates: listAlternates,
    })
  }

  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: {
      updatedAt: true,
      publishedAt: true,
      translations: { select: { locale: true, slug: true } },
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  })

  for (const post of posts) {
    const slugs: Record<string, string> = {}
    for (const translation of post.translations) {
      const locale = String(translation.locale || '').split('-')[0]
      if (locale && translation.slug) slugs[locale] = translation.slug
    }

    const locales = Object.keys(slugs)
    if (locales.length === 0) continue

    const alternates: Record<string, string> = {}
    for (const locale of locales) {
      alternates[locale] = `${base}/${locale}/blog/${slugs[locale]}`
    }
    const defaultLocale = slugs.tr ? 'tr' : locales[0]
    alternates['x-default'] = `${base}/${defaultLocale}/blog/${slugs[defaultLocale]}`

    const lastmod = (post.updatedAt || post.publishedAt)?.toISOString()
    for (const locale of locales) {
      entries.push({
        loc: alternates[locale],
        lastmod,
        changefreq: 'monthly',
        priority: '0.6',
        alternates,
      })
    }
  }

  return entries
}
