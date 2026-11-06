import type { Metadata } from 'next'
import { FaqListClient } from '@/components/home/faq-list-client'
import prisma from '@/lib/prisma'
import { sanitizeText } from '@/lib/sanitize-html'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 300

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://www.hivhestin.com').replace(/\/$/, '')

type FaqItem = { id: string; question: string; answer: string | null }

async function getFaqs(locale: string): Promise<FaqItem[]> {
  try {
    const rows = await prisma.fAQ.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: { translations: { where: { locale } } },
    })

    return rows
      .map((row) => ({
        id: row.id,
        question: row.translations[0]?.question?.trim() || '',
        answer: row.translations[0]?.answer ?? null,
      }))
      .filter((item) => item.question)
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isEn = locale.startsWith('en')
  const url = `${SITE_URL}/${locale}/faqs`
  const title = isEn ? 'Frequently Asked Questions' : 'Sıkça Sorulan Sorular'
  const description = isEn
    ? 'Find answers to common questions about our products and services.'
    : 'Ürünlerimiz ve hizmetlerimizle ilgili sıkça sorulan soruların yanıtlarını bulun.'

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: `${SITE_URL}/tr/faqs`,
        en: `${SITE_URL}/en/faqs`,
        'x-default': `${SITE_URL}/tr/faqs`,
      },
    },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: { index: true, follow: true },
  }
}

export default async function FaqsPage({ params }: Props) {
  const { locale } = await params
  const items = await getFaqs(locale)
  const title = locale === 'tr' ? 'Sıkça Sorulan Sorular' : 'Frequently Asked Questions'

  const faqJsonLd = items.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: sanitizeText(item.answer || ''),
          },
        })),
      }
    : null

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-6">
      {faqJsonLd && (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <h1 className="text-2xl font-semibold">{title}</h1>
      <FaqListClient items={items} locale={locale} />
    </div>
  )
}