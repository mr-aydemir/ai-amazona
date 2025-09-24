import NextAuth from 'next-auth'
import createIntlMiddleware from 'next-intl/middleware'
import authConfig from './auth.config'
import { locales } from './i18n'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always'
})

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  // Run the intl middleware for all requests
  return intlMiddleware(req)
})

export const config = {
  matcher: ['/', '/(tr|en)/:path*', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
