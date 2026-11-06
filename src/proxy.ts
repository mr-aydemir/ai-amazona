import createIntlMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale, type Locale } from './i18n/config'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export const proxy = async (req: NextRequest) => {
  // Skip intl middleware for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Redirect root to the preferred locale. Auth is handled by the layouts,
  // so no NextAuth round-trip is needed here.
  if (req.nextUrl.pathname === '/') {
    const cookieLocale = req.cookies.get('preferredLocale')?.value as Locale | undefined
    const targetLocale =
      cookieLocale && locales.includes(cookieLocale) ? cookieLocale : defaultLocale
    const url = new URL(`/${targetLocale}`, req.url)
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.cookies.set('preferredLocale', targetLocale, {
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE,
    })
    return redirectResponse
  }

  const pathname = req.nextUrl.pathname
  const firstSegment = pathname.split('/')[1]
  const hasLocalePrefix = locales.includes(firstSegment as Locale)
  const currentLocale = hasLocalePrefix ? (firstSegment as Locale) : null
  const effectiveLocale: Locale = currentLocale ?? defaultLocale

  // Locale-less URLs are permanently redirected to the preferred/default locale.
  if (!hasLocalePrefix) {
    const cookieLocale = req.cookies.get('preferredLocale')?.value as Locale | undefined
    const targetLocale =
      cookieLocale && locales.includes(cookieLocale) ? cookieLocale : defaultLocale
    const url = new URL(`/${targetLocale}${pathname}`, req.url)
    url.search = req.nextUrl.search
    const redirectResponse = NextResponse.redirect(url, 308)
    redirectResponse.cookies.set('preferredLocale', targetLocale, {
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE,
    })
    return redirectResponse
  }

  const response = intlMiddleware(req) || NextResponse.next()
  response.headers.set('x-locale', effectiveLocale)

  if (currentLocale) {
    response.cookies.set('preferredLocale', currentLocale, {
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE,
    })
  }

  return response
}

export const config = {
  matcher: [
    // Skip API routes, all internal paths (_next), static files, sitemap.xml, robots.txt
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|google-feed.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|avi|mov|wmv|flv|webm)$).*)',
    // Always run for admin paths
    '/admin/:path*',
  ],
}
