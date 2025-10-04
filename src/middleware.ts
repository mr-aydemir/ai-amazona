import NextAuth from 'next-auth'
import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import authConfig from './auth.config'
import { locales, type Locale } from './i18n/config'
import { prisma } from './lib/prisma'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always'
})

const { auth } = NextAuth(authConfig)

export default auth(async (req) => {
  // Skip intl middleware for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return
  }

  // Get the locale from the pathname
  const pathname = req.nextUrl.pathname
  const currentLocale = pathname.split('/')[1] || 'en'

  // Check if user is authenticated and has a preferred locale
  let userPreferredLocale: Locale | null = null
  if (req.auth?.user?.id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.auth.user.id },
        select: { preferredLocale: true }
      })
      if (user?.preferredLocale && locales.includes(user.preferredLocale as Locale)) {
        userPreferredLocale = user.preferredLocale as Locale
      }
    } catch (error) {
      console.error('Error fetching user preferred locale:', error)
    }
  }

  // If user has a preferred locale and it's different from current locale, redirect
  if (userPreferredLocale && userPreferredLocale !== currentLocale && locales.includes(userPreferredLocale)) {
    const newPathname = pathname.replace(`/${currentLocale}`, `/${userPreferredLocale}`)
    const url = new URL(newPathname, req.url)
    url.search = req.nextUrl.search
    return NextResponse.redirect(url)
  }

  // Run the intl middleware for all other requests
  const response = intlMiddleware(req) || NextResponse.next()

  // Add the locale to the headers
  response.headers.set('x-locale', currentLocale)

  return response
})

export const config = {
  matcher: [
    // Skip API routes, all internal paths (_next), static files, sitemap.xml, robots.txt
    // Excluding '/api' from middleware prevents interference with Auth.js endpoints like '/api/auth/session'
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\.(?:svg|png|jpg|jpeg|gif|webp|mp4|avi|mov|wmv|flv|webm)$).*)',
    // Always run for admin paths
    '/admin/:path*'
  ]
}