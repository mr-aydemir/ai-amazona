import prisma from '@/lib/prisma'
import { analyzeBlogQuality, type QualityCheck, type QualityResult } from '@/lib/blog-quality'

export type QualityTranslation = {
  locale: string
  title: string
  excerpt: string
  contentHtml: string
  metaTitle?: string | null
  metaDescription?: string | null
}

export type TranslationQuality = {
  locale: 'tr' | 'en'
  result: QualityResult
}

async function getExistingPosts(locale: 'tr' | 'en', excludeId?: string) {
  const rows = await prisma.blogPost.findMany({
    where: { translations: { some: { locale } } },
    select: {
      id: true,
      translations: { where: { locale }, select: { title: true, contentHtml: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 300,
  })

  return rows
    .filter((row) => row.id !== excludeId)
    .map((row) => ({
      id: row.id,
      title: row.translations[0]?.title || '',
      contentHtml: row.translations[0]?.contentHtml || '',
    }))
    .filter((row) => row.title && row.contentHtml)
}

export async function evaluateBlogTranslations(
  translations: QualityTranslation[],
  excludeId?: string
): Promise<TranslationQuality[]> {
  const results: TranslationQuality[] = []

  for (const translation of translations) {
    const locale: 'tr' | 'en' = translation.locale === 'en' ? 'en' : 'tr'
    const existing = await getExistingPosts(locale, excludeId)
    const result = analyzeBlogQuality({
      title: translation.title,
      excerpt: translation.excerpt,
      contentHtml: translation.contentHtml,
      metaTitle: translation.metaTitle,
      metaDescription: translation.metaDescription,
      existing,
    })
    results.push({ locale, result })
  }

  return results
}

export function collectFailedChecks(results: TranslationQuality[]) {
  return results.flatMap(({ locale, result }) =>
    result.checks
      .filter((item): item is QualityCheck => item.status === 'fail')
      .map((item) => ({ locale, ...item }))
  )
}
