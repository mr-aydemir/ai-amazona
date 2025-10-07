import { notFound } from 'next/navigation'
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

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-16'>
        {/* Product Gallery */}
        <ProductGallery images={product.images} />

        {/* Product Information */}
        <ProductInfo product={product} vatRate={vatRate} showInclVat={showInclVat} />
      </div>

      {/* Reviews Section */}
      <div className='mb-16'>
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
