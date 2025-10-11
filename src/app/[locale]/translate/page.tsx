'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'

export default function TranslateTestPage() {
  const [text, setText] = useState('Evinize Canlılık ve Şıklık Katın: Modern Siyah Vazo!')
  const [translated, setTranslated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const locale = useLocale()

  const onTranslate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setTranslated(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Çeviri başarısız')
      } else {
        setTranslated(data?.translated || '')
      }
    } catch (e) {
      setError('Sunucu hatası')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='container mx-auto px-4 py-8 space-y-4'>
      <h1 className='text-2xl font-bold'>Çeviri Testi</h1>
      <p className='text-muted-foreground'>
        Dil: {locale}
      </p>
      <form onSubmit={onTranslate} className='space-y-4'>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className='w-full border rounded p-2'
          rows={5}
          placeholder='Türkçe metin giriniz'
        />
        <button
          type='submit'
          className='px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50'
          disabled={loading}
        >
          {loading ? 'Çevriliyor...' : 'İngilizceye Çevir'}
        </button>
      </form>
      {error && <p className='text-red-600'>{error}</p>}
      {translated !== null && (
        <div className='space-y-2'>
          <h2 className='text-lg font-semibold'>Sonuç</h2>
          <p className='whitespace-pre-wrap'>{translated}</p>
        </div>
      )}
    </div>
  )
}