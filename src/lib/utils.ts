import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'TRY':
      return '₺'
    case 'USD':
      return '$'
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    default:
      return currency
  }
}

function formatNumber(amount: number, locale: string, fractionDigits = 2): string {
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}

// Genel fiyat formatlama: TRY için sembol sağda, diğerleri varsayılan konumda
export function formatPrice(price: number, currency: string = 'TRY', locale?: string) {
  const nfLocale = locale || (currency === 'TRY' ? 'tr-TR' : 'en-US')
  if (currency === 'TRY') {
    const num = formatNumber(price, nfLocale)
    return `${num}${getCurrencySymbol(currency)}`
  }
  return new Intl.NumberFormat(nfLocale, { style: 'currency', currency }).format(price)
}

export function formatCurrency(amount: number, currency: string = 'TRY', locale?: string): string {
  const nfLocale = locale || (currency === 'TRY' ? 'tr-TR' : 'en-US')
  if (currency === 'TRY') {
    const num = formatNumber(amount, nfLocale)
    return `${num}${getCurrencySymbol(currency)}`
  }
  return new Intl.NumberFormat(nfLocale, { style: 'currency', currency }).format(amount)
}
