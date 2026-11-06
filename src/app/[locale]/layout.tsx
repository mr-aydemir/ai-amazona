import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Serif } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { locales } from '@/i18n/config'
import { ClientProviders } from '@/components/providers/client-providers'
import { CurrencyProvider } from '@/components/providers/currency-provider'
import { SessionProvider } from '@/components/providers/session-provider'
import { CartProvider } from '@/components/providers/cart-provider'
import { getCurrencyData } from '@/lib/server-currency'
import { AnalyticsTracker } from '@/components/analytics/analytics-tracker'
import '../globals.css'

export const runtime = 'nodejs'

const geistSans = IBM_Plex_Serif({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: '400',
})

const geistMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: '400',
})

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  'https://www.hivhestin.com'
).replace(/\/$/, '')
const siteName = 'Hivhestın'
const logoUrl = `${siteUrl}/logo.png`

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Hivhestın',
  description: 'Hivhestın – 3D baskı ürünleri, kişiye özel tasarımlar ve hızlı kargo ile güvenli alışveriş.',
  applicationName: 'Hivhestın',
  keywords: ['Hivhestın', '3D baskı', '3D printer', 'kişiye özel ürün', 'online alışveriş'],
  openGraph: {
    type: 'website',
    siteName: 'Hivhestın',
    title: 'Hivhestın',
    description: 'Hivhestın – 3D baskı ürünleri, kişiye özel tasarımlar ve hızlı kargo ile güvenli alışveriş.',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hivhestın',
    description: 'Hivhestın – 3D baskı ürünleri, kişiye özel tasarımlar ve hızlı kargo ile güvenli alışveriş.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!locales.includes(locale as any)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages({ locale })
  const { baseCurrency, rates } = await getCurrencyData()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="y37VB1an15zbqgWKjj_psV3vI7K0PYQfqipQY0j7z8w" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: siteName,
              url: siteUrl,
              logo: logoUrl,
              sameAs: ['https://www.instagram.com/hivhestin3d_official/'],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              url: siteUrl,
              name: siteName,
              inLanguage: locale,
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientProviders
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CurrencyProvider baseCurrency={baseCurrency} displayCurrency={baseCurrency} rates={rates}>
            <NextIntlClientProvider messages={messages}>
              <SessionProvider>
                <CartProvider>
                  <Suspense fallback={null}>
                    <AnalyticsTracker />
                  </Suspense>
                  {children}
                </CartProvider>
              </SessionProvider>
            </NextIntlClientProvider>
          </CurrencyProvider>
        </ClientProviders>
      </body>
    </html>
  )
}
