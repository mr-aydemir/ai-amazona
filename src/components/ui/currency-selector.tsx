'use client'

import { useEffect, useState } from 'react'
import { useCurrencyStore } from '@/store/use-currency'

const SUPPORTED = ['TRY', 'USD', 'EUR', 'GBP']

function getCookie(name: string) {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()!.split(';').shift() || null
  return null
}

export function CurrencySelector() {
  const [currency, setCurrency] = useState<string>('TRY')
  const setDisplayCurrency = useCurrencyStore((s) => s.setDisplayCurrency)
  const storeCurrency = useCurrencyStore((s) => s.displayCurrency)

  useEffect(() => {
    // İlk yüklemede store’daki değeri kullan
    if (storeCurrency && SUPPORTED.includes(storeCurrency)) {
      setCurrency(storeCurrency)
    }
  }, [])

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setCurrency(value)
    setDisplayCurrency(value)
  }

  return (
    <select
      value={currency}
      onChange={onChange}
      className='h-9 rounded-md border bg-background px-2 text-sm'
      aria-label='Currency'
      title='Currency'
    >
      {SUPPORTED.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  )
}