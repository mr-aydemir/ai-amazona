import { prisma } from '@/lib/prisma'

type ExchangeRate = {
  currency: string
  rate: number
  updatedAt?: Date
}

export async function getCurrencyData(): Promise<{
  baseCurrency: string
  rates: ExchangeRate[]
}> {
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
}

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