'use server'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const size = parseInt(searchParams.get('size') || '1000')
    const q = (searchParams.get('search') || '').trim()

    const apiKey = process.env.TRENDYOL_API_KEY
    const apiSecret = process.env.TRENDYOL_API_SECRET
    const userAgent = process.env.TRENDYOL_USER_AGENT || `SelfIntegration`

    // Use PRODUCTION integration endpoints per user documentation
    const base = `https://apigw.trendyol.com/integration/product/brands`
    const url = q
      ? `${base}/by-name?name=${encodeURIComponent(q)}`
      : `${base}?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      Accept: 'application/json',
    }
    if (apiKey && apiSecret) {
      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
      headers['Authorization'] = `Basic ${auth}`
    }

    const res = await fetch(url, { headers })
    const raw = await res.text()
    let json: any = raw
    try { json = JSON.parse(raw) } catch { }
    if (!res.ok) {
      return NextResponse.json({ error: 'Trendyol marka listesi alınamadı', status: res.status, body: json }, { status: res.status })
    }

    let brands: Array<{ id: number, name: string }> = []
    // Integration endpoint returns either { brands: [...] } or an array when using /by-name
    if (Array.isArray(json?.brands)) brands = json.brands
    else if (Array.isArray(json)) brands = json

    return NextResponse.json({ brands, page, size, count: brands.length })
  } catch (error: any) {
    return NextResponse.json({ error: 'Sunucu hatası', message: error?.message ?? 'unknown error' }, { status: 500 })
  }
}