import NextAuth from 'next-auth'
import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import authConfig from './auth.config'
import { locales } from './i18n/config'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always'
})

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  // Skip intl middleware for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return
  }
  
  // Get the locale from the pathname
  const pathname = req.nextUrl.pathname
  const locale = pathname.split('/')[1] || 'en'
  
  // Run the intl middleware for all other requests
  const response = intlMiddleware(req) || NextResponse.next()
  
  // Add the locale to the headers
  response.headers.set('x-locale', locale)
  
  return response
})

export const config = {
  matcher: [
    // Skip all internal paths (_next), static files, sitemap.xml, robots.txt
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\.(?:svg|png|jpg|jpeg|gif|webp|mp4|avi|mov|wmv|flv|webm)$).*)',
    // Always run for admin paths
    '/admin/:path*'
  ]
}