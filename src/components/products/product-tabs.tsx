'use client'

import { useMemo, useEffect, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { sanitizeRichHtml } from '@/lib/sanitize-html'
import { ProductReviews } from '@/components/products/product-reviews'
import { InstallmentTableInline } from '@/components/checkout/installment-table-inline'
import { useCurrency } from '@/components/providers/currency-provider'
import ProductQA from '@/components/products/product-qa'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface InstallmentPrice {
  installmentPrice: number
  totalPrice: number
  installmentNumber: number
}

interface InstallmentDetail {
  price: number
  cardFamilyName?: string
  force3ds?: number
  bankCode?: number
  bankName?: string
  forceCvc?: number
  installmentPrices: InstallmentPrice[]
}

interface ProductTabsProps {
  product: {
    id: string
    description: string
    price: number
    reviews: { rating: number }[]
    attributes?: { name: string; unit?: string | null; type: string; value: any }[]
  }
  vatRate?: number
  showInclVat?: boolean
  // SSR'dan taksit detaylarını alıp direkt render etmek için ek props
  installmentDetails?: InstallmentDetail[]
  installmentCurrency?: string
  localeForInstallments?: string
  // SSR'dan Q&A verisini geçirmek için ek props
  qaItems?: any[]
  // SSR'dan reviews verisini geçirmek için ek props
  reviewItems?: any[]
}

export function ProductTabs({
  product,
  vatRate: vatRateProp,
  showInclVat: showInclVatProp,
  installmentDetails,
  installmentCurrency,
  localeForInstallments,
  qaItems,
  reviewItems,
}: ProductTabsProps) {
  const { convert } = useCurrency()
  const vatRate = typeof vatRateProp === 'number' ? vatRateProp : 0
  const showInclVat = !!showInclVatProp
  const tp = useTranslations('products.product')
  const tqa = useTranslations('products.qa')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'specs'

  // Track attributes to allow switching when variant changes via URL (?variant=<id>)
  const [attributes, setAttributes] = useState<Array<{ name: string; unit?: string | null; type: string; value: any }>>(Array.isArray(product.attributes) ? product.attributes : [])

  useEffect(() => {
    const variantId = searchParams.get('variant')
    // If no variant or same as base product, use base attributes
    if (!variantId || variantId === product.id) {
      setAttributes(Array.isArray(product.attributes) ? product.attributes : [])
      return
    }
    // Fetch attributes for selected variant
    const controller = new AbortController()
    const run = async () => {
      try {
        const res = await fetch(`/api/products/attributes/${encodeURIComponent(locale)}/${encodeURIComponent(variantId)}`, { cache: 'no-store', signal: controller.signal })
        const json = await res.json()
        if (res.ok && Array.isArray(json?.attributes)) {
          setAttributes(json.attributes)
        } else {
          // Fallback to base attributes if API fails
          setAttributes(Array.isArray(product.attributes) ? product.attributes : [])
        }
      } catch {
        // Network error: fallback to base
        setAttributes(Array.isArray(product.attributes) ? product.attributes : [])
      }
    }
    run()
    return () => controller.abort()
  }, [searchParams, product.id, product.attributes, locale])

  const displayPrice = useMemo(() => {
    const base = product.price
    const raw = showInclVat ? base * (1 + vatRate) : base
    return convert(raw)
  }, [convert, product.price, showInclVat, vatRate])

  const fmt = (amount: number) => {
    const currency = installmentCurrency || 'TRY'
    const locale = (localeForInstallments || 'tr').startsWith('en') ? 'en-US' : 'tr-TR'
    return formatCurrency(amount, currency, locale)
  }

  const familyImage = (key: string) => {
    const map: Record<string, string> = {
      bonus: '/images/iyzico/bonus.jpg',
      maximum: '/images/iyzico/maximum.jpg',
      axess: '/images/iyzico/axess.jpg',
      world: '/images/iyzico/world.jpg',
      paraf: '/images/iyzico/paraf.jpg',
      cardfinans: '/images/iyzico/cardFinans.jpg',
      ziraatbankasi: '/images/iyzico/ziraatBankası.jpg',
      qnbcc: '/images/iyzico/qnb cc.png',
    }
    return map[key] || ''
  }

  return (
    <div className='mt-2'>
      <Tabs defaultValue={initialTab}>
        <TabsList className='w-full !grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'>
          <TabsTrigger value='specs' className='w-full'>{tp('specifications')}</TabsTrigger>
          <TabsTrigger value='reviews' className='w-full'>{tp('reviews')}</TabsTrigger>
          <TabsTrigger value='qa' className='w-full'>{tqa('title')}</TabsTrigger>
          <TabsTrigger value='payments' className='w-full'>{tp('payments')}</TabsTrigger>
        </TabsList>
        <TabsContent value='details' className='pt-4'></TabsContent>
        <TabsContent value='specs' className='pt-4 space-y-4'>

          <div className='space-y-3'>
            {Array.isArray(attributes) && attributes.length > 0 && (
              <>
                <div className='text-base font-semibold'>{tp('specifications')}</div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  {attributes.map((attr, idx) => (
                    <div key={idx} className='flex items-start justify-between rounded-md border p-2'>
                      <div className='text-sm font-medium'>{attr.name}</div>
                      <div className='text-sm text-muted-foreground'>
                        {(() => {
                          if (attr.value === null || typeof attr.value === 'undefined') return '-'
                          if (attr.type === 'BOOLEAN') return attr.value ? tp('yes') : tp('no')
                          if (attr.type === 'NUMBER') return `${attr.value}${attr.unit ? ' ' + attr.unit : ''}`
                          return String(attr.value)
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className='text-base font-semibold mt-4'>{tp('description')}</div>
            <div
              className='prose prose-sm max-w-none'
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.description || '') }}
            />
          </div>
        </TabsContent>
        <TabsContent value='reviews' className='pt-4'>
          <ProductReviews productId={product.id} reviews={product.reviews as any} initialItems={reviewItems as any} />
        </TabsContent>
        <TabsContent value='qa' className='pt-4'>
          <ProductQA productId={product.id} initialItems={qaItems as any} />
        </TabsContent>
        <TabsContent value='payments' className='pt-4'>
          {Array.isArray(installmentDetails) && installmentDetails.length > 0 ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {(() => {
                const norm = (s?: string) => (s || 'diger')
                  .toLowerCase()
                  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
                  .replace(/[^a-z0-9]+/g, '')
                const groups: Record<string, { name: string; rows: Array<{ installmentNumber: number, installmentPrice: number, totalPrice: number }> }> = {}
                for (const d of installmentDetails) {
                  const key = norm(d.cardFamilyName || d.bankName || 'Diğer')
                  const name = d.cardFamilyName || d.bankName || 'Diğer'
                  if (!groups[key]) groups[key] = { name, rows: [] }
                  for (const ip of d.installmentPrices || []) {
                    groups[key].rows.push({
                      installmentNumber: ip.installmentNumber,
                      installmentPrice: ip.installmentPrice,
                      totalPrice: ip.totalPrice,
                    })
                  }
                  groups[key].rows.sort((a, b) => a.installmentNumber - b.installmentNumber)
                }
                return Object.entries(groups).map(([key, group]) => (
                  <div key={`family-${key}`} className='border rounded-md'>
                    <div className='flex items-center justify-center gap-3 p-3 border-b bg-muted/50'>
                      {familyImage(key) ? (
                        <div className='relative h-8 w-32'>
                          <Image src={familyImage(key)} alt={group.name} fill className='object-contain' />
                        </div>
                      ) : (
                        <div className='text-sm font-semibold'>{group.name}</div>
                      )}
                    </div>
                    <div className='overflow-x-auto'>
                      <table className='min-w-full text-sm'>
                        <thead>
                          <tr className='bg-muted'>
                            <th className='text-left p-2'>Taksit Sayısı</th>
                            <th className='text-right p-2'>Taksit Tutarı</th>
                            <th className='text-right p-2'>Toplam Tutar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row, idx) => (
                            <tr key={`row-${key}-${idx}`} className='border-t'>
                              <td className='p-2'>{row.installmentNumber === 1 ? 'Tek Çekim' : `${row.installmentNumber}`}</td>
                              <td className='p-2 text-right'>{fmt(row.installmentPrice)}</td>
                              <td className='p-2 text-right font-medium'>{fmt(row.totalPrice)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <InstallmentTableInline price={displayPrice} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}