import { LatestProducts } from '@/components/home/latest-products'
import BannerCarousel from '@/components/home/banner/banner-carousel'
import { TopSellers } from '@/components/home/top-sellers'
import { TrustBadges } from '@/components/home/trust-badges'
import { CategoryShowcase, type ShowcaseCategory } from '@/components/home/category-showcase'
import { HomeReviews, type HomeReview } from '@/components/home/home-reviews'
import { NewsletterSignup } from '@/components/home/newsletter'
import prisma from '@/lib/prisma'
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

  const [categoryRows, reviewRows, reviewStats] = await Promise.all([
    prisma.category.findMany({
      where: { products: { some: { status: 'ACTIVE' } } },
      include: {
        translations: { where: { locale } },
        _count: { select: { products: { where: { status: 'ACTIVE' } } } },
        products: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { images: true },
        },
      },
      orderBy: { products: { _count: 'desc' } },
      take: 8,
    }),
    prisma.review.findMany({
      where: { rating: { gte: 4 }, comment: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 18,
      include: {
        user: { select: { name: true } },
        product: {
          select: {
            id: true,
            name: true,
            translations: { where: { locale }, select: { name: true } },
          },
        },
      },
    }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
  ])

  const showcaseCategories: ShowcaseCategory[] = categoryRows
    .map((category) => {
      let image = category.image
      if (!image || image === '/images/placeholder.jpg') {
        try {
          const parsed = JSON.parse(category.products[0]?.images || '[]')
          image = Array.isArray(parsed) && parsed.length ? parsed[0] : null
        } catch {
          image = null
        }
      }
      return {
        id: category.id,
        name: category.translations[0]?.name || category.name,
        slug: category.translations[0]?.slug || category.slug,
        image,
        count: category._count.products,
      }
    })
    .sort((a, b) => b.count - a.count)

  const homeReviews: HomeReview[] = reviewRows
    .filter((review) => (review.comment || '').trim().length > 0)
    .map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: (review.comment || '').trim(),
      author: review.user?.name || review.guestName || (locale === 'tr' ? 'Müşteri' : 'Customer'),
      productName: review.product.translations[0]?.name || review.product.name,
      source: review.source,
    }))

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

      <TrustBadges />

      <CategoryShowcase locale={locale} categories={showcaseCategories} />

      <LatestProducts products={latestProducts} vatRate={vatRate} showInclVat={showInclVat} />

      {topSellers.length > 0 ? (
        <TopSellers products={topSellers} vatRate={vatRate} showInclVat={showInclVat} />
      ) : null}

      <HomeReviews
        reviews={homeReviews}
        average={reviewStats._avg.rating ?? 0}
        total={reviewStats._count}
      />

      <NewsletterSignup />
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
