import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ALLOWED_HOSTS = new Set(['cdn.dsmcdn.com', 'utfs.io'])

function fallback(request: NextRequest) {
  return NextResponse.redirect(new URL('/images/blog/default.svg', request.url), 307)
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url') || ''

  try {
    const target = new URL(raw)
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
      return fallback(request)
    }

    const response = await fetch(target.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HivhestinBot/1.0)',
        Accept: 'image/avif,image/webp,image/jpeg,image/png,image/*',
      },
      next: { revalidate: 86400 },
    })

    if (!response.ok) return fallback(request)

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) return fallback(request)

    const buffer = Buffer.from(await response.arrayBuffer())
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=604800',
      },
    })
  } catch {
    return fallback(request)
  }
}
