import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClientProviders } from '@/components/providers/client-providers'
import './globals.css'
import { headers } from 'next/headers'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Hivhestin',
  description: 'Your one-stop shop for amazing products',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers();
  const locale = headersList.get('x-locale') || 'en';
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientProviders
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
