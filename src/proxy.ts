import NextAuth from 'next-auth'
import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import authConfig from './auth.config'
import { locales, type Locale } from './i18n/config'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always'
})

const { auth } = NextAuth(authConfig)

export const proxy = auth(async (req) => {
  // Skip intl middleware for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // If visiting root path '/', redirect to locale-prefixed homepage to avoid loops
  if (req.nextUrl.pathname === '/') {
    const cookieLocale = req.cookies.get('preferredLocale')?.value as Locale | undefined
    const targetLocale = cookieLocale && locales.includes(cookieLocale) ? cookieLocale : 'en'
    const url = new URL(`/${targetLocale}`, req.url)
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.cookies.set('preferredLocale', targetLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    return redirectResponse
  }

  // Get info from pathname
  const pathname = req.nextUrl.pathname
  const firstSegment = pathname.split('/')[1]
  // Only treat first segment as locale if it EXACTLY matches one of supported locales
  const hasLocalePrefix = locales.includes(firstSegment as Locale)
  const currentLocale = hasLocalePrefix ? (firstSegment as Locale) : null
  const effectiveLocale: Locale = currentLocale ?? 'en'

  // If path has NO locale prefix (e.g. /products/slug), redirect to preferred or default locale preserving full path
  if (!hasLocalePrefix) {
    const cookieLocale = req.cookies.get('preferredLocale')?.value as Locale | undefined
    const targetLocale = cookieLocale && locales.includes(cookieLocale) ? cookieLocale : 'en'
    // Preserve the entire path after adding locale prefix
    const url = new URL(`/${targetLocale}${pathname}`, req.url)
    url.search = req.nextUrl.search
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.cookies.set('preferredLocale', targetLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    return redirectResponse
  }

  // Check if user is authenticated and has a preferred locale
  // IMPORTANT: Only consider preferred locale when path has NO locale prefix.
  // If the URL already specifies a locale, we respect the explicit choice
  // and avoid redirecting based on cookie/db preference.
  let userPreferredLocale: Locale | null = null
  if (req.auth?.user?.id && !hasLocalePrefix) {
    const cookieLocale = req.cookies.get('preferredLocale')?.value as Locale | undefined
    if (cookieLocale && locales.includes(cookieLocale)) {
      userPreferredLocale = cookieLocale
    } else if (effectiveLocale === 'en') {
      // Only fetch preferred locale when on default locale to avoid repeated calls
      try {
        const baseUrl = req.nextUrl.origin
        const cookie = req.headers.get('cookie') || ''
        const res = await fetch(`${baseUrl}/api/user/language`, {
          headers: { cookie },
          cache: 'no-store'
        })
        if (res.ok) {
          const data = await res.json()
          const locale = data?.locale as Locale | undefined
          if (locale && locales.includes(locale)) {
            userPreferredLocale = locale
          }
        }
      } catch (error) {
        console.error('Error fetching user preferred locale:', error)
      }
    }
  }

  // If user has a preferred locale and path has NO locale prefix, redirect
  if (userPreferredLocale && !hasLocalePrefix && locales.includes(userPreferredLocale)) {
    const url = new URL(`/${userPreferredLocale}${pathname}`, req.url)
    url.search = req.nextUrl.search
    const redirectResponse = NextResponse.redirect(url)
    // Cache preferred locale on redirect to prevent repeated API calls
    redirectResponse.cookies.set('preferredLocale', userPreferredLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    return redirectResponse
  }

  // Run the intl middleware for all other requests
  const response = intlMiddleware(req) || NextResponse.next()

  // Add the locale to the headers
  response.headers.set('x-locale', effectiveLocale)

  // Persist explicit locale choice in cookie to keep it in sync with URL
  if (currentLocale) {
    response.cookies.set('preferredLocale', currentLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
  } else if (userPreferredLocale) {
    // If currentLocale isn't present (no prefix), cache preferred locale
    response.cookies.set('preferredLocale', userPreferredLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
  }

  return response
})

export const config = {
  matcher: [
    // Skip API routes, all internal paths (_next), static files, sitemap.xml, robots.txt
    // Excluding '/api' from middleware prevents interference with Auth.js endpoints like '/api/auth/session'
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|google-feed.xml|robots.txt|.*\.(?:svg|png|jpg|jpeg|gif|webp|mp4|avi|mov|wmv|flv|webm)$).*)',
    // Always run for admin paths
    '/admin/:path*'
  ]
}
