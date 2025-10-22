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

export function ProductRelated({ categoryId, currentProductId, vatRate, showInclVat }: ProductRelatedProps) {
  const t = useTranslations('products.related')
  const locale = useLocale()
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const res = await fetch(`/api/products/related/${locale}?categoryId=${categoryId}&currentProductId=${currentProductId}`)
        if (!res.ok) return
        const data = await res.json()
        setProducts(Array.isArray(data) ? data : [])
      } catch { }
    }
    fetchRelated()
  }, [locale, categoryId, currentProductId])

  if (!products.length) {
    return null
  }

  return (
    <div className='space-y-6'>
      <h3 className='text-xl font-semibold'>{t('title')}</h3>
      <Carousel className='w-full'>
        <CarouselContent>
          {products.map((product) => {
            const parsedImages = Array.isArray(product.images)
              ? product.images
              : JSON.parse(product.images || '[]')
            return (
              <CarouselItem
                key={product.id}
                className='basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6'
              >
                <ProductCard
                  product={{
                    ...product,
                    images: parsedImages,
                    originalPrice: product.originalPrice ?? undefined,
                  }}
                  vatRate={vatRate}
                  showInclVat={showInclVat}
                />
              </CarouselItem>
            )
          })}
        </CarouselContent>

        <CarouselPrevious className='left-4 md:left-8 ' />
        <CarouselNext className='right-4 md:right-8 ' />
      </Carousel>
    </div>
  )
}
