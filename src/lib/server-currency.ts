import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

type ExchangeRate = {
  currency: string
  rate: number
  updatedAt?: Date
}

async function loadCurrencyData(): Promise<{
  baseCurrency: string
  rates: ExchangeRate[]
}> {
  try {
    const setting = await prisma.systemSetting.findFirst()
    const baseCurrency = setting?.baseCurrency || 'USD'

    // Align with Prisma model: ExchangeRate has fields { id, code, rate, updatedAt }
    const rows = await prisma.exchangeRate.findMany({
      select: { code: true, rate: true, updatedAt: true },
      orderBy: { code: 'asc' },
    })

    const rates: ExchangeRate[] = rows.map((r) => ({
      currency: r.code,
      rate: r.rate,
      updatedAt: r.updatedAt,
    }))

    return { baseCurrency, rates }
  } catch (error) {
    console.error('[CURRENCY_FETCH]', error)
    return { baseCurrency: 'TRY', rates: [] }
  }
}

// Cached across requests: currency settings change rarely.
export const getCurrencyData = unstable_cache(loadCurrencyData, ['currency-data'], {
  revalidate: 300,
  tags: ['currency'],
})

export function convertServer(
  amount: number,
  baseCurrency: string,
  displayCurrency: string,
  rates: ExchangeRate[]
): number {
  const map = Object.fromEntries(rates.map((r) => [r.currency, r.rate])) as Record<string, number>
  const baseRate = map[baseCurrency] ?? 1
  const displayRate = map[displayCurrency] ?? baseRate
  const ratio = displayRate / baseRate
  return amount * ratio
}
