import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import PromoTicker from '@/components/layout/promo-ticker'
import Script from 'next/script'

export default async function HomeLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const locale = (await params).locale
  return (
    <div className='flex min-h-screen flex-col'>
      <Script src="https://www.googletagmanager.com/gtag/js?id=AW-17730766605" strategy="afterInteractive" />
      <Script id="google-ads-gtag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 
          gtag('js', new Date());
          gtag('config', 'AW-17730766605');
        `}
      </Script>
      {/* Top promo ticker */}
      <PromoTicker locale={locale} />
      <Header />
      <main className='flex-1'>{children}</main>
      <Footer />
    </div>
  )
}
