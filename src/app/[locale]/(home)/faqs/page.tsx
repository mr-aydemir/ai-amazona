import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { FaqListClient } from '@/components/home/faq-list-client'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const isEn = locale?.startsWith('en')
  const path = 'faqs'
  const url = `${baseUrl.replace(/\/$/, '')}/${locale}/${path}`
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
        tr: `${baseUrl.replace(/\/$/, '')}/tr/${path}`,
        en: `${baseUrl.replace(/\/$/, '')}/en/${path}`,
      },
    },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
    },
    robots: { index: true, follow: true },
  }
}

export default async function FaqsPage({ params }: Props) {
  const { locale } = await params
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const base = `${proto}://${host}`

  const res = await fetch(`${base}/api/faqs/${locale}`, { next: { revalidate: 0 } })
  const data = (await res.json()) as { items?: { id: string; question: string; answer: string | null }[] }

  const title = locale === 'tr' ? 'Sıkça Sorulan Sorular' : 'Frequently Asked Questions'

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <FaqListClient items={data.items || []} locale={locale} />
    </div>
  )
}