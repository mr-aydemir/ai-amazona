import { notFound, permanentRedirect } from 'next/navigation'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { getCurrencyData } from '@/lib/server-currency'
import { ProductDetailClient } from '@/components/products/product-detail-client'
import { ProductTabs } from '@/components/products/product-tabs'
import { ProductRelated } from '@/components/products/product-related'
import { ProductBreadcrumb } from '@/components/products/product-breadcrumb'
import { prisma } from '@/lib/prisma'
import { sanitizeText } from '@/lib/sanitize-html'

type tParams = Promise<{ slug: string, locale: string }>

interface ProductPageProps {
  params: tParams
}

async function getProduct(slug: string, locale: string) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/products/slug/${locale}/${slug}`, {
      next: { revalidate: 60 },
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
  const { slug, locale } = await params
  const product = await getProduct(slug, locale)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const canonicalSlug = product?.slug || slug
  const localeSlugs = (product?.localeSlugs || {}) as Record<string, string>
  const url = `${baseUrl.replace(/\/$/, '')}/${locale}/products/${canonicalSlug}`

  const title = product?.name ? `${product.name} | Hivhestın` : `Ürün | Hivhestın`
  const cleanedDescription = sanitizeText(product?.description || '').replace(/\s+/g, ' ').trim().slice(0, 158)
  const description = cleanedDescription || 'Ürün detayları ve müşteri yorumları'
  const image = Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : undefined

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: `${baseUrl.replace(/\/$/, '')}/tr/products/${localeSlugs.tr || canonicalSlug}`,
        en: `${baseUrl.replace(/\/$/, '')}/en/products/${localeSlugs.en || canonicalSlug}`,
        'x-default': `${baseUrl.replace(/\/$/, '')}/tr/products/${localeSlugs.tr || canonicalSlug}`,
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
  const { slug, locale } = await props.params
  const product = await getProduct(slug, locale)

  // Fetch pricing settings on the server
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
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
    // ignore and use defaults in components
  }

  if (!product) {
    notFound()
  }

  // Aynı ürüne ID veya farklı slug ile erişildiyse kalıcı olarak kanonik slug'a yönlendir
  const canonicalSlug = product.slug || slug
  if (slug !== canonicalSlug) {
    permanentRedirect(`/${locale}/products/${canonicalSlug}`)
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

  // Prepare concurrent SSR fetches for promo texts, installments, Q&A, reviews, and variants
  const promoTextsPromise = (async (): Promise<string[]> => {
    try {
      const items = await prisma.promoText.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        include: { translations: { where: { locale }, select: { text: true } } }
      })
      return items.map((it) => it.translations[0]?.text?.trim()).filter(Boolean) as string[]
    } catch {
      return []
    }
  })()

  // Build JSON-LD for Schema.org Product
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
  const productUrl = `${siteUrl}/${locale}/products/${product.slug || slug}`
  const plainDescription = String(product.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000)

  // Google kuralı: aggregateRating yalnızca sitede toplanan (birinci taraf) yorumlara dayanmalı.
  const siteReviews = Array.isArray(product.reviews)
    ? (product.reviews as Array<{ rating: number; source?: string | null }>).filter(
        (r) => (r.source || 'SITE') === 'SITE'
      )
    : []
  const averageRating = siteReviews.length
    ? siteReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / siteReviews.length
    : undefined

  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: plainDescription,
    image: Array.isArray(product.images) ? product.images : [],
    sku: product.id,
    category: product?.category?.name,
    url: productUrl,
    brand: {
      '@type': 'Brand',
      name: 'Hivhestın',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      price: Number(product.price),
      priceCurrency: baseCurrency,
      itemCondition: 'https://schema.org/NewCondition',
      availability: (product.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    },
    ...(averageRating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(averageRating.toFixed(1)),
        reviewCount: siteReviews.length
      }
    } : {})
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'tr' ? 'Ana Sayfa' : 'Home',
        item: `${siteUrl}/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'tr' ? 'Ürünler' : 'Products',
        item: `${siteUrl}/${locale}/products`,
      },
      ...(product?.category?.name
        ? [{
            '@type': 'ListItem',
            position: 3,
            name: product.category.name,
            item: `${siteUrl}/${locale}/products?category=${encodeURIComponent(product.category.slug || product.category.id)}`,
          }]
        : []),
      {
        '@type': 'ListItem',
        position: product?.category?.name ? 4 : 3,
        name: product.name,
        item: productUrl,
      },
    ],
  }

  const installmentsPromise = (async (): Promise<Array<{ price: number; cardFamilyName?: string; bankName?: string; installmentPrices: Array<{ installmentPrice: number; totalPrice: number; installmentNumber: number }> }>> => {
    try {
      const amountBase = (showInclVat ? (product.price * (1 + (vatRate || 0))) : product.price)
      const res = await fetch(`${baseUrl}/api/iyzico/installments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: amountBase, currency: baseCurrency })
      })
      const json = await res.json()
      if (res.ok && json?.success && Array.isArray(json.installmentDetails)) {
        return json.installmentDetails
      }
    } catch {}
    return []
  })()

  const qaPromise = (async (): Promise<any[]> => {
    try {
      const qRes = await fetch(`${baseUrl}/api/questions?productId=${product.id}`, {
        next: { revalidate: 60 },
      })
      if (qRes.ok) {
        const qJson = await qRes.json()
        return Array.isArray((qJson as any)?.items) ? (qJson as any).items : (Array.isArray(qJson) ? qJson : [])
      }
    } catch {}
    return []
  })()

  const reviewsPromise = (async (): Promise<any[]> => {
    try {
      const rRes = await fetch(`${baseUrl}/api/reviews?productId=${product.id}`, {
        next: { revalidate: 60 },
      })
      if (rRes.ok) {
        const rJson = await rRes.json()
        return Array.isArray((rJson as any)?.items) ? (rJson as any).items : (Array.isArray(rJson) ? rJson : [])
      }
    } catch {}
    return []
  })()

  const variantsPromise = (async (): Promise<{ label: string | null; variants: Array<{ id: string; name: string; images: string[]; price: number; stock: number; optionLabel?: string | null }>; variantDimensions?: Array<{ id: string; name: string; type: 'SELECT' | 'TEXT', options?: Array<{ label: string }> }>; }> => {
    try {
      const vRes = await fetch(`${baseUrl}/api/products/variants/${product.id}?locale=${locale}`, {
        next: { revalidate: 60 },
      })
      if (vRes.ok) {
        const vJson = await vRes.json()
        if (vJson && Array.isArray(vJson?.variants)) {
          return vJson
        }
      }
    } catch {}
    return { label: null, variants: [], variantDimensions: [] }
  })()

  const [promoTexts, installmentDetails, qaItems, reviewItems, variantsData] = await Promise.all([
    promoTextsPromise,
    installmentsPromise,
    qaPromise,
    reviewsPromise,
    variantsPromise,
  ])

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Structured Data for SEO */}
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Breadcrumb */}
      <ProductBreadcrumb product={product} locale={locale} />
      <ProductDetailClient
        product={product}
        vatRate={vatRate}
        showInclVat={showInclVat}
        initialFavorited={initialFavorited}
        promoTexts={promoTexts}
        variants={variantsData.variants}
        variantLabel={variantsData.label || null}
        variantDimensions={variantsData.variantDimensions || []}
      />

      {/* Tabbed Details/Reviews/Payments */}
      <div className='mb-16'>
        <ProductTabs product={product} vatRate={vatRate} showInclVat={showInclVat} installmentDetails={installmentDetails} installmentCurrency={baseCurrency} localeForInstallments={locale} qaItems={qaItems} reviewItems={reviewItems} />
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
