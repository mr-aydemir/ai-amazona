'use client'

import { useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { sanitizeRichHtml } from '@/lib/sanitize-html'
import { ProductReviews } from '@/components/products/product-reviews'
import { InstallmentTableInline } from '@/components/checkout/installment-table-inline'
import { useCurrency } from '@/components/providers/currency-provider'
import ProductQA from '@/components/products/product-qa'

interface ProductTabsProps {
  product: {
    id: string
    description: string
    price: number
    reviews: { rating: number }[]
  }
  vatRate?: number
  showInclVat?: boolean
}

export function ProductTabs({ product, vatRate: vatRateProp, showInclVat: showInclVatProp }: ProductTabsProps) {
  const { convert } = useCurrency()
  const vatRate = typeof vatRateProp === 'number' ? vatRateProp : 0
  const showInclVat = !!showInclVatProp

  const displayPrice = useMemo(() => {
    const base = product.price
    const raw = showInclVat ? base * (1 + vatRate) : base
    return convert(raw)
  }, [convert, product.price, showInclVat, vatRate])

  return (
    <div className='mt-2'>
      <Tabs defaultValue='details'>
        <TabsList className='w-full'>
          <TabsTrigger value='details' className='flex-1'>Detaylar</TabsTrigger>
          <TabsTrigger value='reviews' className='flex-1'>Yorumlar</TabsTrigger>
          <TabsTrigger value='qa' className='flex-1'>Sorular</TabsTrigger>
          <TabsTrigger value='payments' className='flex-1'>Ödeme Seçenekleri</TabsTrigger>
        </TabsList>
        <TabsContent value='details' className='pt-4'>
          <div
            className='prose prose-sm max-w-none'
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.description || '') }}
          />
        </TabsContent>
        <TabsContent value='reviews' className='pt-4'>
          <ProductReviews productId={product.id} reviews={product.reviews as any} />
        </TabsContent>
        <TabsContent value='qa' className='pt-4'>
          <ProductQA productId={product.id} />
        </TabsContent>
        <TabsContent value='payments' className='pt-4'>
          <InstallmentTableInline price={displayPrice} />
        </TabsContent>
      </Tabs>
    </div>
  )
}