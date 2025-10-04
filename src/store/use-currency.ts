'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type CurrencyState = {
  displayCurrency: string
  setDisplayCurrency: (code: string) => void
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      // Varsayılan TRY; admin ayarlarıyla uyumlu ve mevcut kullanımda destekleniyor
      displayCurrency: 'TRY',
      setDisplayCurrency: (code: string) => set({ displayCurrency: code })
    }),
    {
      name: 'currency-store',
      version: 1
    }
  )
)