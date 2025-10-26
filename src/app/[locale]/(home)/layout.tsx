import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import PromoTicker from '@/components/layout/promo-ticker'

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
      {/* Top promo ticker */}
      <PromoTicker locale={locale} />
      <Header />
      <main className='flex-1'>{children}</main>
      <Footer />
    </div>
  )
}
