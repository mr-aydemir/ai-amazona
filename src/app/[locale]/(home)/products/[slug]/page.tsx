import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import Script from 'next/script'
import { getCurrencyData } from '@/lib/server-currency'
import { ProductDetailClient } from '@/components/products/product-detail-client'
import { ProductTabs } from '@/components/products/product-tabs'
import { ProductRelated } from '@/components/products/product-related'
import { ProductBreadcrumb } from '@/components/products/product-breadcrumb'
import { prisma } from '@/lib/prisma'

type tParams = Promise<{ slug: string, locale: string }>

interface ProductPageProps {
  params: tParams
}

async function getProduct(slug: string, locale: string) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/products/slug/${locale}/${slug}`, {
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
  const { slug, locale } = await params
  const product = await getProduct(slug, locale)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const url = `${baseUrl.replace(/\/$/, '')}/${locale}/products/${slug}`

  const title = product?.name ? `${product.name} | Hivhestın` : `Ürün | Hivhestın`
  const description = product?.description || 'Ürün detayları ve müşteri yorumları'
  const image = Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : undefined

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: `${baseUrl.replace(/\/$/, '')}/tr/products/${slug}`,
        en: `${baseUrl.replace(/\/$/, '')}/en/products/${slug}`,
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

  // SSR fetch promo texts for current locale
  const promoTexts: string[] = await (async () => {
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
  const productUrl = `${siteUrl}/${locale}/products/${slug}`
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

  // SSR: taksit bilgilerini getir
  let installmentDetails: Array<{ price: number; cardFamilyName?: string; bankName?: string; installmentPrices: Array<{ installmentPrice: number; totalPrice: number; installmentNumber: number }> }> = []
  try {
    const amountBase = (showInclVat ? (product.price * (1 + (vatRate || 0))) : product.price)
    const res = await fetch(`${baseUrl}/api/iyzico/installments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: amountBase, currency: baseCurrency })
    })
    const json = await res.json()
    if (res.ok && json?.success && Array.isArray(json.installmentDetails)) {
      installmentDetails = json.installmentDetails
    }
  } catch (e) {
    // SSR taksit sorgusu başarısızsa sessizce geç
  }

  // SSR: ürün sorularını getir (public)
  let qaItems: any[] = []
  try {
    const qRes = await fetch(`${baseUrl}/api/questions?productId=${product.id}`, { cache: 'no-store' })
    if (qRes.ok) {
      const qJson = await qRes.json()
      qaItems = Array.isArray((qJson as any)?.items) ? (qJson as any).items : (Array.isArray(qJson) ? qJson : [])
    }
  } catch {
    // SSR Q&A sorgusu başarısızsa sessizce geç
  }

  // SSR: ürün yorumlarını getir
  let reviewItems: any[] = []
  try {
    const rRes = await fetch(`${baseUrl}/api/reviews?productId=${product.id}`, { cache: 'no-store' })
    if (rRes.ok) {
      const rJson = await rRes.json()
      reviewItems = Array.isArray((rJson as any)?.items) ? (rJson as any).items : (Array.isArray(rJson) ? rJson : [])
    }
  } catch {
    // SSR yorumlar sorgusu başarısızsa sessizce geç
  }

  // SSR: ürün varyantlarını getir (varsa)
  let variantsData: { label: string | null; variants: Array<{ id: string; name: string; images: string[]; price: number; stock: number; optionLabel?: string | null }> } = { label: null, variants: [] }
  try {
    const vRes = await fetch(`${baseUrl}/api/products/variants/${product.id}?locale=${locale}`, { cache: 'no-store' })
    if (vRes.ok) {
      const vJson = await vRes.json()
      if (vJson && Array.isArray(vJson?.variants)) {
        variantsData = vJson
      }
    }
  } catch {
    // sessizce geç
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Structured Data for SEO */}
      <Script id='product-jsonld' type='application/ld+json'>
        {JSON.stringify(jsonLd)}
      </Script>

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
