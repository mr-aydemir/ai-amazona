'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCart } from '@/store/use-cart'
import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'
import Link from 'next/link'

interface ProductInfoProps {
  product: {
    id: string
    name: string
    description: string
    price: number
    stock: number
    images: string[]
    reviews: {
      rating: number
    }[]
  }
}

export function ProductInfo({ product }: ProductInfoProps) {
  const [quantity, setQuantity] = useState('1')
  const cart = useCart()
  const { toast } = useToast()
  const t = useTranslations('products.product')

  // Calculate average rating
  const averageRating = product.reviews.length
    ? product.reviews.reduce((acc, review) => acc + review.rating, 0) /
      product.reviews.length
    : 0

  const handleAddToCart = () => {
    cart.addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      quantity: parseInt(quantity),
    })

    toast({
      title: t('product_added'),
      description: `${quantity} x ${product.name} ${t('product_added')}`,
      action: (
        <ToastAction altText='View cart' asChild>
          <Link href='/cart'>{t('view_cart')}</Link>
        </ToastAction>
      ),
    })
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>{product.name}</h1>
        <div className='flex items-center gap-2 mt-2'>
          <div className='flex'>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= averageRating
                    ? 'fill-primary text-primary'
                    : 'fill-muted text-muted'
                }`}
              />
            ))}
          </div>
          <span className='text-muted-foreground'>
            ({product.reviews.length} {t('reviews')})
          </span>
        </div>
      </div>

      <div className='text-2xl font-bold'>${product.price.toFixed(2)}</div>

      <div className='prose prose-sm'>
        <p>{product.description}</p>
      </div>

      <div className='space-y-4'>
        <div>
          <div className='text-sm font-medium mb-2'>{t('quantity')}</div>
          <Select value={quantity} onValueChange={setQuantity}>
            <SelectTrigger className='w-24'>
              <SelectValue placeholder={t('select_quantity')} />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: Math.min(10, product.stock) }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='text-sm text-muted-foreground'>
          {product.stock > 0 ? (
            <span className='text-green-600'>{t('in_stock')}</span>
          ) : (
            <span className='text-red-600'>{t('out_of_stock')}</span>
          )}
        </div>

        <Button
          onClick={handleAddToCart}
          className='w-full'
          disabled={product.stock === 0}
        >
          {t('add_to_cart')}
        </Button>
      </div>
    </div>
  )
}
