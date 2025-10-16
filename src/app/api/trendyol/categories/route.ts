'use server'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.TRENDYOL_API_KEY
    const apiSecret = process.env.TRENDYOL_API_SECRET
    const userAgent = process.env.TRENDYOL_USER_AGENT || `SelfIntegration`

    const url = `https://apigw.trendyol.com/integration/product/product-categories`
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
      return NextResponse.json({ error: 'Trendyol kategori listesi alınamadı', status: res.status, body: json }, { status: res.status })
    }

    return NextResponse.json(json)
  } catch (error: any) {
    return NextResponse.json({ error: 'Sunucu hatası', message: error?.message ?? 'unknown error' }, { status: 500 })
  }
}