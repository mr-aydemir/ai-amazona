import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function buildOrigin(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL
  if (env) return env.replace(/\/$/, '')
  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`
}

export async function GET(req: NextRequest) {
  try {
    const origin = buildOrigin(req)
    const lines = [
      'User-agent: *',
      'Allow: /',
      // Prevent indexing internal/admin and sensitive paths (locale-prefixed included via wildcard)
      'Disallow: /*/admin',
      'Disallow: /admin',
      'Disallow: /*/dashboard',
      'Disallow: /dashboard',
      'Disallow: /*/auth',
      'Disallow: /api/',
      'Disallow: /*/checkout',
      'Disallow: /*/order-confirmation',
      'Disallow: /*/cart',
      '',
      `Sitemap: ${origin}/sitemap.xml`,
    ]

    const body = lines.join('\n') + '\n'
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, max-age=3600',
      },
    })
  } catch (e) {
    console.error('[ROBOTS_TXT_ERROR]', e)
    return NextResponse.json({ error: 'Failed to build robots.txt' }, { status: 500 })
  }
}