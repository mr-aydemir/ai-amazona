'use client'

import { ProductCard } from '@/components/ui/product-card'
import { Product } from '@prisma/client'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { Button } from '../ui/button'

interface LatestProductsProps {
  products: Product[]
  vatRate?: number
  showInclVat?: boolean
}

export function LatestProducts({ products, vatRate, showInclVat }: LatestProductsProps) {
  const t = useTranslations('home')
  const locale = useLocale()
  return (
    <section className='container mx-auto px-4 sm:px-6 lg:px-8 mb-5'>
      <h2 className='text-2xl font-bold mb-6'>{t('latest_products')}</h2>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'>
        {products.map((product) => {
          // Parse images from JSON string to array
          const parsedImages = Array.isArray(product.images)
            ? product.images
            : JSON.parse(product.images || '[]')

          return (
            <ProductCard
              key={product.id}
              product={{
                ...product,
                images: parsedImages
              }}
              vatRate={vatRate}
              showInclVat={showInclVat}
            />
          )
        })}
      </div>
      <div className='mt-6 flex justify-center'>
        <Button asChild>
          <Link href={`/${locale}/products`} className='text-primary hover:underline font-medium'>
            {t('latest_products_view_all')}
          </Link>
        </Button>
      </div>
    </section>
  )
}
