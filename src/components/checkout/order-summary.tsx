'use client'

import { useCart } from '@/store/use-cart'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

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
}

export function OrderSummary({ orderItems, orderTotal }: OrderSummaryProps) {
  const cart = useCart()

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
                <p className='text-sm text-muted-foreground'>Qty: {item.quantity}</p>
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
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className='flex justify-between text-sm'>
          <span>Shipping</span>
          <span>{formatPrice(shipping)}</span>
        </div>
        <div className='flex justify-between text-sm'>
          <span>Tax</span>
          <span>{formatPrice(tax)}</span>
        </div>
        <Separator />
        <div className='flex justify-between font-medium'>
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  )
}
