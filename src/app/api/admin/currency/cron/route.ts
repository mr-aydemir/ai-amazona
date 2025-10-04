import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Public cron endpoint: checks admin-defined refresh interval and updates rates if due
export async function GET() {
  try {
    const setting = await prisma.systemSetting.findFirst()
    const baseCurrency = setting?.baseCurrency || 'TRY'
    const refreshDays = Math.max(1, setting?.currencyRefreshDays ?? 1)
    const lastUpdate = setting?.lastRatesUpdateAt ?? null

    const now = new Date()
    let shouldUpdate = false
    if (!lastUpdate) {
      shouldUpdate = true
    } else {
      const diffMs = now.getTime() - new Date(lastUpdate).getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      shouldUpdate = diffDays >= refreshDays
    }

    if (!shouldUpdate) {
      return NextResponse.json({
        ok: true,
        updated: 0,
        reason: 'not_due',
        refreshDays,
        lastRatesUpdateAt: lastUpdate
      })
    }

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
    const grab = (code: string) => {
      const re = new RegExp(`<Currency[^>]*(?:Kod|CurrencyCode)="${code}"[\s\S]*?<ForexSelling>([^<]+)<\/ForexSelling>`, 'i')
      const m = xml.match(re)
      if (!m) return NaN
      const v = Number(String(m[1]).replace(',', '.'))
      return isNaN(v) ? NaN : v
    }

    const forexSelling: Record<string, number> = {}
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

    // Compute relative to baseCurrency
    const computeRate = (code: string) => {
      const tlCode = tlPerUnit(code)
      const tlBase = tlPerUnit(baseCurrency)
      if (!tlCode || !tlBase || isNaN(tlCode) || isNaN(tlBase)) return NaN
      return tlCode / tlBase
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
        data: { lastRatesUpdateAt: now }
      })
    }

    return NextResponse.json({ ok: true, updated: results.length, lastRatesUpdateAt: now })
  } catch (error) {
    console.error('Admin Currency CRON error:', error)
    return NextResponse.json({ error: 'Failed to run currency cron' }, { status: 500 })
  }
}