export function formatCurrency(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
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