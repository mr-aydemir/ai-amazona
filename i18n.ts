import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

// Can be imported from a shared config
export const locales = ['en', 'tr'] as const
export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound()

  return {
    locale,
    messages: {
      // Load all message files for the locale
      ...(await import(`./messages/${locale}/common.json`)).default,
      auth: (await import(`./messages/${locale}/auth.json`)).default,
      products: (await import(`./messages/${locale}/products.json`)).default,
      cart: (await import(`./messages/${locale}/cart.json`)).default,
      admin: (await import(`./messages/${locale}/admin.json`)).default,
    }
  }
})