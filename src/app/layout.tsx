import type { Metadata } from 'next'
import { Geist, Geist_Mono } from "next/font/google"
import { ClientProviders } from '@/components/providers/client-providers'
import { CurrencyProvider } from '@/components/providers/currency-provider'
import { getCurrencyData } from '@/lib/server-currency'
import './globals.css'
import { headers } from 'next/headers'
import Script from 'next/script'

// Ensure Node.js runtime so Prisma Client can be used in RSC
export const runtime = 'nodejs'

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Hivhestın',
  description: 'Your one-stop shop for amazing products',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers();
  const locale = headersList.get('x-locale') || 'en';
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
        <meta property="og:site_name" content={siteName} />
        <meta property="og:image" content={logoUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={siteName} />
        <meta name="twitter:image" content={logoUrl} />
        <Script id="schema-org-organization" type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            url: origin,
            name: siteName,
            logo: logoUrl,
          })}
        </Script>
        <Script id="schema-org-website" type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            url: origin,
            name: siteName,
            inLanguage: locale,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${origin}/search?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          })}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Hivhestın",
              "url": "https://hivhestin.com",
              "logo": "https://hivhestin.com/logo.png",
              "sameAs": [
                "https://www.instagram.com/hivhestin3d_official/",
                //"https://x.com/hivhestin"
              ]
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientProviders
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CurrencyProvider baseCurrency={baseCurrency} displayCurrency={displayCurrency} rates={rates}>
            {children}
          </CurrencyProvider>
        </ClientProviders>
      </body>
    </html>
  )
}
