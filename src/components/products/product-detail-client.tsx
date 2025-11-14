'use client'

import { useState, useMemo } from 'react'
import { ProductGallery } from '@/components/products/product-gallery'
import { ProductInfo } from '@/components/products/product-info'

type VariantItem = { id: string; name: string; images: string[]; price: number; stock: number; optionLabel?: string | null; attributes?: Array<{ attrId: string; attrName: string; label: string }> }

interface ProductDetailClientProps {
  product: {
    id: string
    name: string
    description: string
    price: number
    originalPrice?: number
    stock: number
    images: string[]
    reviews: { rating: number }[]
  }
  vatRate?: number
  showInclVat?: boolean
  initialFavorited?: boolean
  promoTexts?: string[]
  variants?: VariantItem[]
  variantLabel?: string | null
  variantDimensions?: Array<{ id: string; name: string; type: 'SELECT' | 'TEXT', options?: Array<{ label: string }> }>
}

export function ProductDetailClient({ product, vatRate, showInclVat, initialFavorited, promoTexts = [], variants = [], variantLabel = null, variantDimensions = [] }: ProductDetailClientProps) {
  const [imagesForGallery, setImagesForGallery] = useState<string[]>(Array.isArray(product.images) ? product.images : [])

  const handleVariantChange = (variant: VariantItem) => {
    const imgs = Array.isArray(variant.images) ? variant.images : []
    setImagesForGallery(imgs.length ? imgs : imagesForGallery)
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 items-start md:items-stretch'>
      {/* Product Gallery */}
      <div className='h-full'>
        <ProductGallery images={imagesForGallery} />
      </div>

      {/* Product Information */}
      <div className='h-full'>
        <ProductInfo
          product={product}
          vatRate={vatRate}
          showInclVat={showInclVat}
          initialFavorited={initialFavorited}
          promoTexts={promoTexts}
          variants={variants}
          variantLabel={variantLabel || null}
          variantDimensions={variantDimensions}
          onVariantChange={handleVariantChange}
        />
      </div>
    </div>
  )
}
