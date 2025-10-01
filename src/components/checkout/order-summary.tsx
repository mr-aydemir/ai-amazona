'use client'

import { useCart } from '@/store/use-cart'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useTranslations } from 'next-intl'

interface OrderSummaryProps {
  orderItems?: Array<{
    id: string
    product: {
      id: string
      name: string
      images: string
    }
    quantity: number
    price: number
  }>
  orderTotal?: number
  selectedInstallment?: {
    installmentCount: number
    installmentPrice: number
    totalPrice: number
  }
}

export function OrderSummary({ orderItems, orderTotal, selectedInstallment }: OrderSummaryProps) {
  const cart = useCart()
  const t = useTranslations('cart')

  // Use order items if provided (for payment page), otherwise use cart items
  const items = orderItems || cart.items.map(item => ({
    id: item.id,
    product: {
      id: item.productId,
      name: item.name,
      images: JSON.stringify([item.image])
    },
    quantity: item.quantity,
    price: item.price
  }))

  const subtotal = orderTotal ? orderTotal - 10 - (orderTotal - 10) * 0.1 : items.reduce((total, item) => {
    return total + item.price * item.quantity
  }, 0)

  const shipping = 10 // Fixed shipping cost
  const tax = subtotal * 0.1 // 10% tax
  const total = orderTotal || subtotal + shipping + tax

  // Use installment total if available, otherwise use regular total
  const finalTotal = selectedInstallment ? selectedInstallment.totalPrice : total

  return (
    <div className='space-y-6'>
      <ScrollArea className='h-[300px] pr-4'>
        {items.map((item) => {
          const images = typeof item.product.images === 'string'
            ? JSON.parse(item.product.images)
            : item.product.images
          const imageUrl = Array.isArray(images) ? images[0] : images

          return (
            <div key={item.id} className='flex items-start space-x-4 py-4'>
              <div className='relative h-16 w-16 overflow-hidden rounded-lg'>
                <Image
                  src={imageUrl}
                  alt={item.product.name}
                  fill
                  className='object-cover'
                />
              </div>
              <div className='flex-1 space-y-1'>
                <h3 className='font-medium'>{item.product.name}</h3>
                <p className='text-sm text-muted-foreground'>{t('checkout.qty')}: {item.quantity}</p>
                <p className='text-sm font-medium'>
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            </div>
          )
        })}
      </ScrollArea>

      <Separator />

      <div className='space-y-4'>
        <div className='flex justify-between text-sm'>
          <span>{t('cart.subtotal')}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className='flex justify-between text-sm'>
          <span>{t('checkout.shipping')}</span>
          <span>{formatPrice(shipping)}</span>
        </div>
        <div className='flex justify-between text-sm'>
          <span>{t('checkout.tax')}</span>
          <span>{formatPrice(tax)}</span>
        </div>
        <Separator />
        <div className='flex justify-between font-medium'>
          <span>{t('cart.total')}</span>
          <span>{formatPrice(finalTotal)}</span>
        </div>
        {selectedInstallment && selectedInstallment.installmentCount > 1 && (
          <div className='bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mt-2'>
            <div className='text-sm'>
              <div className='flex justify-between items-center mb-1'>
                <span className='font-medium text-blue-900 dark:text-blue-100'>
                  {selectedInstallment.installmentCount} Taksit
                </span>
                <span className='font-medium text-blue-900 dark:text-blue-100'>
                  {formatPrice(selectedInstallment.installmentPrice)} x {selectedInstallment.installmentCount}
                </span>
              </div>
              <p className='text-xs text-blue-700 dark:text-blue-300'>
                Aylık {formatPrice(selectedInstallment.installmentPrice)} olmak üzere {selectedInstallment.installmentCount} taksitte ödenecektir.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
