'use client'

import { useEffect, useState } from 'react'
import { Product } from '@prisma/client'
import { useTranslations, useLocale } from 'next-intl'
import { ProductCard } from '@/components/ui/product-card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

interface ProductRelatedProps {
  categoryId: string
  currentProductId: string
  vatRate?: number
  showInclVat?: boolean
}

export function ProductRelated({
  categoryId,
  currentProductId,
  vatRate,
  showInclVat,
}: ProductRelatedProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const t = useTranslations('products.product')
  const locale = useLocale()

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        const response = await fetch(
          `/api/products/related/${locale}?categoryId=${categoryId}&currentProductId=${currentProductId}`
        )
        const data = await response.json()
        setProducts(data)
      } catch (error) {
        console.error('Error fetching related products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRelatedProducts()
  }, [categoryId, currentProductId, locale])

  if (loading) {
    return <div>{t('loading_related')}</div>
  }

  if (products.length === 0) {
    return null
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-2xl font-bold'>{t('related_products')}</h2>
      <Carousel className='w-full'>
        <CarouselContent>
          {products.map((product) => {
            // Parse images from JSON string to array
            const parsedImages = Array.isArray(product.images) 
              ? product.images 
              : JSON.parse(product.images || '[]')
            
            return (
              <CarouselItem
                key={product.id}
                className='md:basis-1/2 lg:basis-1/3'
              >
                <ProductCard 
                  product={{
                    ...product,
                    images: parsedImages
                  }} 
                  vatRate={vatRate}
                  showInclVat={showInclVat}
                />
              </CarouselItem>
            )
          })}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  )
}
