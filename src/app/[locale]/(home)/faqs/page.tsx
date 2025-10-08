import { headers } from 'next/headers'

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
      <div className="space-y-4">
        {(data.items || []).map((faq) => (
          <details key={faq.id} className="group rounded-lg border px-4 py-3">
            <summary className="cursor-pointer select-none text-lg font-medium marker:hidden flex items-center justify-between">
              {faq.question}
              <span className="ml-2 text-muted-foreground group-open:hidden">+</span>
              <span className="ml-2 text-muted-foreground hidden group-open:inline">−</span>
            </summary>
            <div className="prose max-w-none mt-2" dangerouslySetInnerHTML={{ __html: faq.answer || '' }} />
          </details>
        ))}
        {(!data.items || data.items.length === 0) && (
          <p className="text-muted-foreground">
            {locale === 'tr' ? 'Henüz soru eklenmedi.' : 'No FAQs added yet.'}
          </p>
        )}
      </div>
    </div>
  )
}