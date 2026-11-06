import type { Metadata } from 'next'
import { Geist, Geist_Mono, IBM_Plex_Mono, IBM_Plex_Serif, PT_Mono, PT_Serif } from "next/font/google"
import { ClientProviders } from '@/components/providers/client-providers'
import { CurrencyProvider } from '@/components/providers/currency-provider'
import { getCurrencyData } from '@/lib/server-currency'
import './globals.css'
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { AnalyticsTracker } from '@/components/analytics/analytics-tracker'

// Ensure Node.js runtime so Prisma Client can be used in RSC
export const runtime = 'nodejs'

const geistSans = IBM_Plex_Serif({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: "400"
})

const geistMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: "400"
})

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://www.hivhestin.com').replace(/\/$/, '')

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers();
  const locale = headersList.get('x-locale') || 'tr';
  const { baseCurrency, rates } = await getCurrencyData()
  // Cookies kullanılmıyor; CurrencyProvider client tarafta store’dan displayCurrency alacak
  const displayCurrency = baseCurrency
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const origin = `${protocol}://${host}`
  const siteName = 'Hivhestın'
  const logoPath = '/logo.png'
  const logoUrl = `${origin}${logoPath}`
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
              url: origin,
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
              url: origin,
              name: siteName,
              inLanguage: locale,
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <ClientProviders
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CurrencyProvider baseCurrency={baseCurrency} displayCurrency={displayCurrency} rates={rates}>
            <Suspense fallback={null}>
              <AnalyticsTracker />
            </Suspense>
            {children}
          </CurrencyProvider>
        </ClientProviders>
      </body>
    </html>
  )
}
