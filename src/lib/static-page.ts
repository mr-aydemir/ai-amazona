import type { Metadata } from 'next'
import prisma from '@/lib/prisma'
import { sanitizeRichHtml, sanitizeText } from '@/lib/sanitize-html'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://www.hivhestin.com').replace(/\/$/, '')

export type StaticPageSlug = 'about' | 'terms' | 'privacy' | 'cookies'

export async function getStaticPage(slug: StaticPageSlug, locale: string) {
  const page = await prisma.page.findUnique({ where: { slug } })
  if (!page) {
    return { title: null as string | null, contentHtml: '' }
  }

  const translation = await prisma.pageTranslation.findUnique({
    where: { pageId_locale: { pageId: page.id, locale } },
  })

  return {
    title: translation?.title?.trim() || null,
    contentHtml: sanitizeRichHtml(translation?.contentHtml || ''),
  }
}

export function buildStaticPageMetadata(params: {
  slug: StaticPageSlug
  locale: string
  title: string | null
  contentHtml: string
  fallbackTitle: { tr: string; en: string }
  fallbackDescription: { tr: string; en: string }
}): Metadata {
  const { slug, locale, title, contentHtml, fallbackTitle, fallbackDescription } = params
  const isEn = locale.startsWith('en')
  const pageTitle = title || (isEn ? fallbackTitle.en : fallbackTitle.tr)
  const description =
    sanitizeText(contentHtml).replace(/\s+/g, ' ').trim().slice(0, 158) ||
    (isEn ? fallbackDescription.en : fallbackDescription.tr)
  const url = `${SITE_URL}/${locale}/${slug}`

  return {
    title: `${pageTitle} | Hivhestın`,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: `${SITE_URL}/tr/${slug}`,
        en: `${SITE_URL}/en/${slug}`,
        'x-default': `${SITE_URL}/tr/${slug}`,
      },
    },
    openGraph: {
      type: 'website',
      url,
      title: pageTitle,
      description,
    },
    twitter: {
      card: 'summary',
      title: pageTitle,
      description,
    },
    robots: { index: true, follow: true },
  }
}
