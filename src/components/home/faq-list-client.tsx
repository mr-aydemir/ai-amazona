'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

type FAQItem = { id: string; question: string; answer: string | null }

export function FaqListClient({ items, locale }: { items: FAQItem[]; locale: string }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => {
      const question = it.question?.toLowerCase() || ''
      const answer = it.answer?.toLowerCase() || ''
      return question.includes(q) || answer.includes(q)
    })
  }, [items, query])

  const placeholder = locale === 'tr' ? 'Sorularda ara...' : 'Search questions...'
  const noItemsText = locale === 'tr' ? 'Henüz soru eklenmedi.' : 'No FAQs added yet.'
  const noResultsText = locale === 'tr' ? 'Eşleşen sonuç bulunamadı.' : 'No matching results.'

  return (
    <div className="space-y-4">
      <div className="relative w-full">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{noItemsText}</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">{noResultsText}</p>
      ) : (
        filtered.map((faq) => (
          <details key={faq.id} className="group rounded-lg border px-4 py-3">
            <summary className="cursor-pointer select-none text-lg font-medium marker:hidden flex items-center justify-between">
              {faq.question}
              <span className="ml-2 text-muted-foreground group-open:hidden">+</span>
              <span className="ml-2 text-muted-foreground hidden group-open:inline">−</span>
            </summary>
            <div className="prose max-w-none mt-2" dangerouslySetInnerHTML={{ __html: faq.answer || '' }} />
          </details>
        ))
      )}
    </div>
  )
}