'use client'

import { useEffect } from 'react'
import { useCurrencyStore } from '@/store/use-currency'

export function CurrencyBootstrapper() {
  const setDisplayCurrency = useCurrencyStore((s) => s.setDisplayCurrency)
  const storeCurrency = useCurrencyStore((s) => s.displayCurrency)

  useEffect(() => {
    // Eğer kullanıcı bir para birimi seçmiş ve localStorage'da mevcutsa, sunucu önerisiyle override etmeyelim
    if (storeCurrency && typeof storeCurrency === 'string' && storeCurrency.length >= 3) {
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/user/currency', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        const code = json?.currency
        if (!cancelled && typeof code === 'string' && code.length >= 3) {
          setDisplayCurrency(code)
        }
      } catch {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [setDisplayCurrency, storeCurrency])

  return null
}