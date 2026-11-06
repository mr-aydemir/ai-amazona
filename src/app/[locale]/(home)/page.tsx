import { LatestProducts } from '@/components/home/latest-products'
import BannerCarousel from '@/components/home/banner/banner-carousel'
import { TopSellers } from '@/components/home/top-sellers'
import { TrustBadges } from '@/components/home/trust-badges'
import { CategoryShowcase, type ShowcaseCategory } from '@/components/home/category-showcase'
import { HomeReviews, type HomeReview } from '@/components/home/home-reviews'
import { NewsletterSignup } from '@/components/home/newsletter'
import { BlogPreview } from '@/components/home/blog-preview'
import { getPublishedBlogPosts } from '@/lib/blog'
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
    const res = await fetch(`${baseUrl}/api/products/${locale}?limit=18&sort=default`, {
      next: { revalidate: 120 },
    })
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
    const res = await fetch(`${baseUrl}/api/bestsellers/${locale}?limit=18`, {
      next: { revalidate: 300 },
    })
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
  const blogPosts = await getPublishedBlogPosts(locale, 1, 3)
    .then((result) => result.items)
    .catch(() => [])
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
      take: 80,
      include: {
        user: { select: { name: true } },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            translations: { where: { locale }, select: { name: true, slug: true } },
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

  // Ürün bazında grupla, sonra ürünler arasında dönüşümlü göster;
  // böylece tek ürünün çok sayıda yorumu listeyi doldurmaz.
  const reviewsByProduct = new Map<string, HomeReview[]>()
  for (const review of reviewRows) {
    if ((review.comment || '').trim().length === 0) continue
    const item: HomeReview = {
      id: review.id,
      rating: review.rating,
      comment: (review.comment || '').trim(),
      author: review.user?.name || review.guestName || (locale === 'tr' ? 'Müşteri' : 'Customer'),
      productName: review.product.translations[0]?.name || review.product.name,
      productSlug:
        review.product.translations[0]?.slug || review.product.slug || review.product.id,
      source: review.source,
    }
    const list = reviewsByProduct.get(review.productId) ?? []
    list.push(item)
    reviewsByProduct.set(review.productId, list)
  }

  const queues = [...reviewsByProduct.values()]
  const homeReviews: HomeReview[] = []
  if (queues.length > 0) {
    let cursor = 0
    while (homeReviews.length < reviewRows.length) {
      let added = false
      for (let i = 0; i < queues.length; i++) {
        const queue = queues[(cursor + i) % queues.length]
        const next = queue.shift()
        if (next) {
          homeReviews.push(next)
          added = true
        }
      }
      if (!added) break
      cursor = (cursor + 1) % queues.length
    }
  }

  // Fetch pricing settings on the server
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`
  let vatRate: number | undefined
  let showInclVat: boolean | undefined
  try {
    const settingsRes = await fetch(`${baseUrl}/api/admin/currency`, {
      next: { revalidate: 300 },
    })
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

      <BlogPreview locale={locale} posts={blogPosts} />

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
