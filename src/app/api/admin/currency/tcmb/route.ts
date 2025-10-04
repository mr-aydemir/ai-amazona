import { NextResponse } from 'next/server'

// Simple XML parser to extract ForexSelling by currency code from TCMB today.xml
function parseForexSelling(xml: string, code: string): number | null {
  const re = new RegExp(`<Currency[^>]*(?:Kod|CurrencyCode)="${code}"[\\s\\S]*?<ForexSelling>([^<]+)</ForexSelling>`, 'i')
  const match = xml.match(re)
  if (!match) return null
  const value = match[1].replace(',', '.')
  const num = Number(value)
  return isNaN(num) ? null : num
}

const SUPPORTED = ['USD', 'EUR', 'GBP']

export async function GET() {
  try {
    const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
      // TCMB sometimes blocks missing UA; set a basic one
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HivhestinBot/1.0)',
        'Accept': 'application/xml,text/xml;q=0.9,*/*;q=0.8'
      },
      // Disable cache to always see latest in dev
      cache: 'no-store'
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'TCMB fetch failed', status: res.status }, { status: 502 })
    }
    const xml = await res.text()

    const tcmbRaw: Record<string, number | null> = {}
    const ratesFromTRY: Record<string, number> = {}
    for (const code of SUPPORTED) {
      const forexSelling = parseForexSelling(xml, code)
      tcmbRaw[code] = forexSelling
      if (forexSelling && forexSelling > 0) {
        // Convert TRY -> target code rate: amount_TRY * (1 / ForexSelling)
        ratesFromTRY[code] = 1 / forexSelling
      }
    }

    return NextResponse.json({
      source: 'TCMB today.xml',
      baseCurrency: 'TRY',
      tcmbForexSellingTRYPerUnit: tcmbRaw,
      ratesFromTRY, // multiplier to convert TRY -> code
    })
  } catch (error) {
    console.error('TCMB GET error:', error)
    return NextResponse.json({ error: 'TCMB fetch error' }, { status: 500 })
  }
}