'use server'

import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  // Read credentials from environment to avoid exposing them to client
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID
  const apiKey = process.env.TRENDYOL_API_KEY
  const apiSecret = process.env.TRENDYOL_API_SECRET
  const page = searchParams.get('page') ?? '0'
  const size = searchParams.get('size') ?? '50'
  const userAgent = process.env.TRENDYOL_USER_AGENT || `${supplierId} - SelfIntegration`

  if (!supplierId || !apiKey || !apiSecret) {
    return Response.json(
      {
        error: 'Missing Trendyol credentials',
        message:
          'Set TRENDYOL_SUPPLIER_ID, TRENDYOL_API_KEY and TRENDYOL_API_SECRET in your environment. Restart dev server after updating .env.local.',
      },
      { status: 500 }
    )
  }

  // Prepare endpoints: try v2 Product Filter first, then legacy/integration fallback
  const endpoints = [
    `https://api.trendyol.com/sapigw/suppliers/${supplierId}/v2/products?page=${encodeURIComponent(
      page
    )}&size=${encodeURIComponent(size)}`,
    `https://api.trendyol.com/integration/product/sellers/${supplierId}/products?page=${encodeURIComponent(
      page
    )}&size=${encodeURIComponent(size)}`,
  ]

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  try {
    // Helper to call endpoint and capture detailed diagnostics
    const callEndpoint = async (url: string) => {
      const res = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          'User-Agent': userAgent,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })
      const raw = await res.text()
      let body: any = raw
      try {
        body = JSON.parse(raw)
      } catch { }
      return { ok: res.ok, status: res.status, statusText: res.statusText, body, url }
    }

    // Try primary (v2) endpoint
    const primary = await callEndpoint(endpoints[0])
    if (primary.ok) {
      return Response.json(primary.body)
    }

    // If unauthorized/forbidden, attempt fallback integration endpoint
    if (primary.status === 401 || primary.status === 403) {
      const fallback = await callEndpoint(endpoints[1])
      if (fallback.ok) {
        return Response.json(fallback.body)
      }
      return Response.json(
        {
          error: 'Trendyol API error',
          hint:
            'Verify supplierId matches the API key/secret and your account has access to the chosen endpoint.',
          primary,
          fallback,
        },
        { status: fallback.status }
      )
    }

    // Non-auth errors from primary
    return Response.json(
      { error: 'Trendyol API error', primary },
      { status: primary.status }
    )
  } catch (err: any) {
    return Response.json(
      { error: 'Request failed', message: err?.message ?? 'unknown error' },
      { status: 500 }
    )
  }
}