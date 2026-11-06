import { NextRequest, NextResponse } from 'next/server'
import { getPublishedBlogPosts } from '@/lib/blog'

export const revalidate = 600

function siteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const base = siteBase()
  const isEn = locale.startsWith('en')
  const { items } = await getPublishedBlogPosts(locale, 1, 50)

  const channelTitle = isEn ? 'Hivhestın Blog' : 'Hivhestın Blog'
  const channelDescription = isEn
    ? 'Guides on 3D printing, materials and decoration.'
    : '3D baskı, malzeme ve dekorasyon üzerine rehberler.'
  const channelLink = `${base}/${locale}/blog`
  const selfLink = `${base}/${locale}/blog/rss.xml`

  const itemsXml = items
    .map((post) => {
      const link = `${base}/${locale}/blog/${post.slug}`
      const date = (post.publishedAt || post.createdAt).toUTCString()
      return (
        `\n    <item>` +
        `\n      <title>${xmlEscape(post.title)}</title>` +
        `\n      <link>${xmlEscape(link)}</link>` +
        `\n      <guid isPermaLink="true">${xmlEscape(link)}</guid>` +
        `\n      <pubDate>${date}</pubDate>` +
        `\n      <description>${xmlEscape(post.excerpt)}</description>` +
        `\n    </item>`
      )
    })
    .join('')

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
    `  <channel>\n` +
    `    <title>${xmlEscape(channelTitle)}</title>\n` +
    `    <link>${xmlEscape(channelLink)}</link>\n` +
    `    <description>${xmlEscape(channelDescription)}</description>\n` +
    `    <language>${isEn ? 'en' : 'tr'}</language>\n` +
    `    <atom:link href="${xmlEscape(selfLink)}" rel="self" type="application/rss+xml"/>\n` +
    itemsXml +
    `\n  </channel>\n</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, max-age=600',
    },
  })
}
