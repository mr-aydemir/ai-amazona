import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClientProviders } from '@/components/providers/client-providers'
import { CurrencyProvider } from '@/components/providers/currency-provider'
import { getCurrencyData } from '@/lib/server-currency'
import './globals.css'
import { headers } from 'next/headers'

// Ensure Node.js runtime so Prisma Client can be used in RSC
export const runtime = 'nodejs'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
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
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="y37VB1an15zbqgWKjj_psV3vI7K0PYQfqipQY0j7z8w" />
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
