'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { useCurrencyStore } from '@/store/use-currency'

type RateEntry = { currency: string; rate: number }

type CurrencyContextValue = {
  baseCurrency: string
  displayCurrency: string
  rates: Record<string, number>
  convert: (amount: number) => number
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({
  baseCurrency,
  displayCurrency,
  rates,
  children,
}: {
  baseCurrency: string
  displayCurrency: string
  rates: RateEntry[]
  children: React.ReactNode
}) {
  const ratesMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of rates) m[r.currency] = r.rate
    return m
  }, [rates])

  // Cookies yerine Zustand store’dan displayCurrency al
  const storeCurrency = useCurrencyStore((s) => s.displayCurrency)
  const activeDisplayCurrency = storeCurrency || displayCurrency

  const value = useMemo(() => {
    const baseRate = ratesMap[baseCurrency] ?? 1
    const displayRate = ratesMap[activeDisplayCurrency] ?? baseRate
    const ratio = displayRate / baseRate
    const convert = (amount: number) => amount * ratio
    return { baseCurrency, displayCurrency: activeDisplayCurrency, rates: ratesMap, convert }
  }, [baseCurrency, activeDisplayCurrency, ratesMap])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}