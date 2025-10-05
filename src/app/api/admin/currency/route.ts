import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// GET: Get system base currency and exchange rates
export async function GET() {
  try {
    const setting = await prisma.systemSetting.findFirst()
    const baseCurrency = setting?.baseCurrency || 'TRY'
    const rates = await prisma.exchangeRate.findMany({
      orderBy: { code: 'asc' }
    })
    return NextResponse.json({
      baseCurrency,
      rates,
      currencyRefreshDays: setting?.currencyRefreshDays ?? 1,
      lastRatesUpdateAt: setting?.lastRatesUpdateAt ?? null,
      vatRate: typeof setting?.vatRate === 'number' ? setting!.vatRate : 0.1,
      shippingFlatFee: typeof setting?.shippingFlatFee === 'number' ? setting!.shippingFlatFee : 10,
    })
  } catch (error) {
    console.error('Admin Currency GET error:', error)
    return NextResponse.json({ error: 'Failed to load currency settings' }, { status: 500 })
  }
}

// PATCH: Update system base currency
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { baseCurrency, currencyRefreshDays, vatRate, shippingFlatFee } = body
    const supported = ['TRY', 'USD', 'EUR', 'GBP']
    if (baseCurrency && !supported.includes(baseCurrency)) {
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 })
    }

    const existing = await prisma.systemSetting.findFirst()
    let setting
    if (!existing) {
      setting = await prisma.systemSetting.create({
        data: {
          baseCurrency: baseCurrency || 'TRY',
          currencyRefreshDays: typeof currencyRefreshDays === 'number' && currencyRefreshDays > 0 ? currencyRefreshDays : 1,
          vatRate: typeof vatRate === 'number' && vatRate >= 0 ? vatRate : 0.1,
          shippingFlatFee: typeof shippingFlatFee === 'number' && shippingFlatFee >= 0 ? shippingFlatFee : 10,
        }
      })
    } else {
      setting = await prisma.systemSetting.update({
        where: { id: existing.id },
        data: {
          ...(baseCurrency ? { baseCurrency } : {}),
          ...(typeof currencyRefreshDays === 'number' && currencyRefreshDays > 0 ? { currencyRefreshDays } : {}),
          ...(typeof vatRate === 'number' && vatRate >= 0 ? { vatRate } : {}),
          ...(typeof shippingFlatFee === 'number' && shippingFlatFee >= 0 ? { shippingFlatFee } : {}),
        }
      })
    }

    // Recompute and upsert exchange rates immediately for the new baseCurrency
    try {
      const base = setting.baseCurrency
      const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HivhestinBot/1.0)',
          'Accept': 'application/xml,text/xml;q=0.9,*/*;q=0.8'
        },
        cache: 'no-store'
      })
      if (res.ok) {
        const xml = await res.text()
        const grab = (code: string) => {
          const re = new RegExp(`<Currency[^>]*(?:Kod|CurrencyCode)="${code}"[\s\S]*?<ForexSelling>([^<]+)</ForexSelling>`, 'i')
          const m = xml.match(re)
          if (!m) return NaN
          const v = Number(String(m[1]).replace(',', '.'))
          return isNaN(v) ? NaN : v
        }
        const tlPerUnit = (code: string) => {
          if (code === 'TRY') return 1
          const v = code === 'USD' || code === 'EUR' || code === 'GBP' ? grab(code) : NaN
          return !v || isNaN(v) ? NaN : v
        }
        const supported = ['TRY', 'USD', 'EUR', 'GBP']
        function computeRate(code: string): number {
          if (code === base) return 1
          const baseTL = tlPerUnit(base)
          const codeTL = tlPerUnit(code)
          if (isNaN(baseTL)) return NaN
          if (code === 'TRY') return baseTL
          if (isNaN(codeTL)) return NaN
          if (base === 'TRY') return 1 / codeTL
          return baseTL / codeTL
        }
        await Promise.all(
          supported.map(async (code) => {
            const rate = computeRate(code)
            if (!rate || isNaN(rate)) return null
            return prisma.exchangeRate.upsert({
              where: { code },
              update: { rate },
              create: { code, rate }
            })
          })
        )
      } else {
        console.error('PATCH currency: TCMB fetch failed')
      }
    } catch (e) {
      console.error('PATCH currency: recompute rates failed', e)
    }

    return NextResponse.json({
      baseCurrency: setting.baseCurrency,
      currencyRefreshDays: setting.currencyRefreshDays,
      vatRate: setting.vatRate,
      shippingFlatFee: setting.shippingFlatFee,
    })
  } catch (error) {
    console.error('Admin Currency PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update base currency' }, { status: 500 })
  }
}

// POST: Fetch and upsert latest exchange rates for base currency
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const setting = await prisma.systemSetting.findFirst()
    const baseCurrency = setting?.baseCurrency || 'TRY'

    // Fetch TCMB rates (TRY base) directly
    const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HivhestinBot/1.0)',
        'Accept': 'application/xml,text/xml;q=0.9,*/*;q=0.8'
      },
      cache: 'no-store'
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch TCMB rates' }, { status: 502 })
    }
    const xml = await res.text()

    // Extract "ForexSelling" values (TL per unit of currency)
    const forexSelling: Record<string, number> = {}
    const grab = (code: string) => {
      const re = new RegExp(`<Currency[^>]*(?:Kod|CurrencyCode)="${code}"[\\s\\S]*?<ForexSelling>([^<]+)</ForexSelling>`, 'i')
      const m = xml.match(re)
      if (!m) return NaN
      const v = Number(String(m[1]).replace(',', '.'))
      return isNaN(v) ? NaN : v
    }
    for (const code of ['USD', 'EUR', 'GBP']) {
      forexSelling[code] = grab(code)
    }

    const supported = ['TRY', 'USD', 'EUR', 'GBP']

    // Helper to get TL per unit for a code; TRY treated as 1
    const tlPerUnit = (code: string) => {
      if (code === 'TRY') return 1
      const v = Number(forexSelling[code])
      return !v || isNaN(v) ? NaN : v
    }

    // Compute rate relative to baseCurrency
    // Rate means: amount_in_base * rate(code) = amount_in_code
    function computeRate(code: string): number {
      if (code === baseCurrency) return 1
      const baseTL = tlPerUnit(baseCurrency)
      const codeTL = tlPerUnit(code)
      if (isNaN(baseTL)) return NaN
      if (code === 'TRY') return baseTL // base -> TRY
      if (isNaN(codeTL)) return NaN
      if (baseCurrency === 'TRY') {
        // TRY -> code: multiply by 1 / codeTL
        return 1 / codeTL
      }
      // base != TRY: base -> code: TL/base divided by TL/code
      return baseTL / codeTL
    }

    const upserts = supported.map(async (code) => {
      const rate = computeRate(code)
      if (!rate || isNaN(rate)) return null
      return prisma.exchangeRate.upsert({
        where: { code },
        update: { rate },
        create: { code, rate }
      })
    })
    const results = (await Promise.all(upserts)).filter(Boolean)

    // Mark last update time
    if (setting) {
      await prisma.systemSetting.update({
        where: { id: setting.id },
        data: { lastRatesUpdateAt: new Date() }
      })
    }

    return NextResponse.json({ baseCurrency, updated: results.length, lastRatesUpdateAt: new Date() })
  } catch (error) {
    console.error('Admin Currency POST error:', error)
    return NextResponse.json({ error: 'Failed to update exchange rates' }, { status: 500 })
  }
}