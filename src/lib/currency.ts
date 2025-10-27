import { formatCurrency as formatCurrencyUtil } from './utils'

export function formatCurrency(amount: number, currency: string, locale: string) {
  try {
    return formatCurrencyUtil(amount, currency, locale)
  } catch {
    return `${currency}${amount.toFixed(2)}`
  }
}

export function convertAmount(
  amount: number,
  baseCurrency: string,
  targetCurrency: string,
  rates: Array<{ code: string; rate: number }>
) {
  if (!amount || !targetCurrency || !baseCurrency) return amount
  if (targetCurrency === baseCurrency) return amount
  const map = new Map(rates.map((r) => [r.code, r.rate]))
  const rate = Number(map.get(targetCurrency)) || 1
  return amount * rate
}