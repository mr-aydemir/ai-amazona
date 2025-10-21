import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import PromoTicker from '@/components/layout/promo-ticker'

export default function HomeLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  return (
    <div className='flex min-h-screen flex-col'>
      {/* Top promo ticker */}
      <PromoTicker locale={params.locale} />
      <Header />
      <main className='flex-1'>{children}</main>
      <Footer />
    </div>
  )
}
