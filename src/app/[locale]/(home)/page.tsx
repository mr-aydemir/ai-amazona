import { LatestProducts } from '@/components/home/latest-products'
import BannerCarousel from '@/components/home/banner/banner-carousel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

async function getLatestProducts(locale: string) {
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/products/${locale}?limit=8&sort=default`, { cache: 'no-store' })
  if (!res.ok) {
    return []
  }
  const data = await res.json().catch(() => null)
  const products = Array.isArray(data?.products) ? data.products : []
  return products
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const latestProducts = await getLatestProducts(locale)
  const tHome = await getTranslations('home')

  // Fetch pricing settings on the server
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  let vatRate: number | undefined
  let showInclVat: boolean | undefined
  try {
    const settingsRes = await fetch(`${baseUrl}/api/admin/currency`, { cache: 'no-store' })
    if (settingsRes.ok) {
      const settings = await settingsRes.json()
      vatRate = typeof settings?.vatRate === 'number' ? settings.vatRate : undefined
      showInclVat = typeof settings?.showPricesInclVat === 'boolean' ? settings.showPricesInclVat : undefined
    }
  } catch {
    // ignore
  }

  // Banner artık DB’den çekiliyor (BannerCarousel)

  return (
    <div className='space-y-8 mt-6'>
      <section className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <BannerCarousel locale={locale} />
      </section>

      <LatestProducts products={latestProducts} vatRate={vatRate} showInclVat={showInclVat} />

      {/* Hızlı ve Güvenli Giriş bölümü */}
      <section className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='rounded-lg border bg-card p-6 shadow-sm'>
          <h2 className='text-2xl font-bold tracking-tight mb-3'>{tHome('quick_login.title')}</h2>
          <p className='text-muted-foreground mb-4'>
            {tHome('quick_login.description')}
          </p>
        </div>
      </section>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const url = `${baseUrl.replace(/\/$/, '')}/${locale}`
  const isEn = locale?.startsWith('en')
  const title = isEn ? 'Hivhestın – Latest Products' : 'Hivhestın – En Yeni Ürünler'
  const description = isEn
    ? 'Discover trending products, deals, and new arrivals.'
    : 'Trend ürünler, fırsatlar ve yeni gelenleri keşfedin.'

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: `${baseUrl.replace(/\/$/, '')}/tr`,
        en: `${baseUrl.replace(/\/$/, '')}/en`,
      },
    },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
    },
    robots: { index: true, follow: true },
  }
}
