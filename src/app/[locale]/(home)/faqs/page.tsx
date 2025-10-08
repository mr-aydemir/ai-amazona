import { headers } from 'next/headers'
import { FaqListClient } from '@/components/home/faq-list-client'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

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