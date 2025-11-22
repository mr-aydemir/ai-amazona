import { LatestProducts } from '@/components/home/latest-products'
import BannerCarousel from '@/components/home/banner/banner-carousel'
import { TopSellers } from '@/components/home/top-sellers'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { headers } from 'next/headers'

async function getLatestProducts(locale: string) {
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`
  try {
    const res = await fetch(`${baseUrl}/api/products/${locale}?limit=18&sort=default`, { cache: 'no-store' })
    if (!res.ok) {
      return []
    }
    const data = await res.json().catch(() => null)
    const products = Array.isArray(data?.products) ? data.products : []
    return products
  } catch {
    return []
  }
}

async function getTopSellers(locale: string) {
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`
  try {
    const res = await fetch(`${baseUrl}/api/bestsellers/${locale}?limit=18`, { cache: 'no-store' })
    if (!res.ok) {
      return []
    }
    const data = await res.json().catch(() => null)
    const products = Array.isArray(data?.products) ? data.products : []
    return products
  } catch {
    return []
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const latestProducts = await getLatestProducts(locale)
  const topSellers = await getTopSellers(locale)
  const tHome = await getTranslations('home')

  // Fetch pricing settings on the server
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`
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

      {topSellers.length > 0 ? (
        <TopSellers products={topSellers} vatRate={vatRate} showInclVat={showInclVat} />
      ) : null}


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
