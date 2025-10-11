import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import Script from 'next/script'
import { getCurrencyData } from '@/lib/server-currency'
import { ProductGallery } from '@/components/products/product-gallery'
import { ProductInfo } from '@/components/products/product-info'
import { ProductReviews } from '@/components/products/product-reviews'
import { ProductRelated } from '@/components/products/product-related'

type tParams = Promise<{ id: string, locale: string }>

interface ProductPageProps {
  params: tParams
}

async function getProduct(id: string, locale: string) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/products/${locale}/${id}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

export async function generateMetadata({ params }: { params: tParams }): Promise<Metadata> {
  const { id, locale } = await params
  const product = await getProduct(id, locale)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const url = `${baseUrl.replace(/\/$/, '')}/${locale}/products/${id}`

  const title = product?.name ? `${product.name} | Hivhestın` : `Ürün | Hivhestın`
  const description = product?.description || 'Ürün detayları ve müşteri yorumları'
  const image = Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : undefined

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: `${baseUrl.replace(/\/$/, '')}/tr/products/${id}`,
        en: `${baseUrl.replace(/\/$/, '')}/en/products/${id}`,
      },
    },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function ProductPage(props: ProductPageProps) {
  const { id, locale } = await props.params
  const product = await getProduct(id, locale)

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
    // ignore and use defaults in components
  }

  if (!product) {
    notFound()
  }

  // Currency for structured data (use baseCurrency from system settings)
  const { baseCurrency } = await getCurrencyData()

  // Determine if product is in user's favorites (server-side)
  let initialFavorited = false
  try {
    const session = await auth()
    if (session?.user) {
      const cookie = (await headers()).get('cookie') || ''
      const favRes = await fetch(`${baseUrl}/api/favorites`, {
        cache: 'no-store',
        headers: { cookie },
      })
      if (favRes.ok) {
        const favData = await favRes.json()
        const items = Array.isArray(favData?.items) ? favData.items : []
        initialFavorited = items.some((item: any) => item?.productId === product.id)
      }
    }
  } catch {
    // ignore favorite detection errors
  }

  // Build JSON-LD for Schema.org Product
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
  const productUrl = `${siteUrl}/${locale}/products/${id}`
  const averageRating = Array.isArray(product.reviews) && product.reviews.length
    ? product.reviews.reduce((acc: number, r: { rating: number }) => acc + (Number(r.rating) || 0), 0) / product.reviews.length
    : undefined
  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: Array.isArray(product.images) ? product.images : [],
    sku: product.id,
    category: product?.category?.name,
    url: productUrl,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      price: product.price,
      priceCurrency: baseCurrency,
      availability: (product.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    },
    ...(averageRating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(averageRating.toFixed(1)),
        reviewCount: product.reviews.length
      }
    } : {})
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Structured Data for SEO */}
      <Script id='product-jsonld' type='application/ld+json'>
        {JSON.stringify(jsonLd)}
      </Script>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-16'>
        {/* Product Gallery */}
        <ProductGallery images={product.images} />

        {/* Product Information */}
        <ProductInfo product={product} vatRate={vatRate} showInclVat={showInclVat} initialFavorited={initialFavorited} />
      </div>

      {/* Reviews Section */}
      <div id='reviews' className='mb-16'>
        <ProductReviews productId={product.id} reviews={product.reviews} />
      </div>

      {/* Related Products */}
      <div>
        <ProductRelated
          categoryId={product.categoryId}
          currentProductId={product.id}
          vatRate={vatRate}
          showInclVat={showInclVat}
        />
      </div>
    </div>
  )
}
