import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n/config'
import { auth } from '@/auth'
import { SessionProvider } from '@/components/providers/session-provider'
import { CartProvider } from '@/components/providers/cart-provider'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params
}: Props) {
  const { locale } = await params

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound()
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages({ locale })
  const session = await auth()
  console.log('LocaleLayout - Messages loaded for locale:', locale)
  try {
    const adminKeys = Object.keys((messages as any)?.admin || {})
    console.log('Admin message top-level keys:', adminKeys)
    console.log('Has customers section?', adminKeys.includes('customers'))
    console.log('Orders content type:', typeof ((messages as any)?.admin?.orders))
    console.log('Orders keys:', Object.keys((messages as any)?.admin?.orders || {}))
  } catch (e) {
    console.log('Debug: could not inspect admin messages', e)
  }

  return (
    <NextIntlClientProvider messages={messages}>
      <SessionProvider session={session}>
        <CartProvider>
          {children}
        </CartProvider>
      </SessionProvider>
    </NextIntlClientProvider>
  )
}