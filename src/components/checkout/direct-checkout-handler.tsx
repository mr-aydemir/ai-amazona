'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/store/use-cart'
import { Loader2 } from 'lucide-react'

interface DirectCheckoutHandlerProps {
  product: {
    id: string
    name: string
    price: number
    image: string
  }
  locale: string
}

export function DirectCheckoutHandler({ product, locale }: DirectCheckoutHandlerProps) {
  const router = useRouter()
  const { addItem, items } = useCart()
  const initialized = useRef(false)

  useEffect(() => {
    const handleDirectCheckout = async () => {
      // Prevent double execution in React Strict Mode
      if (initialized.current) return
      initialized.current = true

      try {
        // Add item to cart
        await addItem({
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1,
        })

        // Use setTimeout to ensure state update has propagated/persisted before redirect
        // and to show a brief visual feedback if needed, though here we want speed.
        // A small delay helps ensure the cart store is updated.
        setTimeout(() => {
           router.replace(`/${locale}/checkout`)
        }, 100)

      } catch (error) {
        console.error('Error in direct checkout:', error)
         // Fallback redirect even on error to avoid getting stuck
        router.replace(`/${locale}/checkout`)
      }
    }

    handleDirectCheckout()
  }, [product, addItem, router, locale])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="text-lg font-medium text-muted-foreground animate-pulse">
        {locale === 'tr' ? 'Ürün sepete ekleniyor...' : 'Adding product to cart...'}
      </p>
    </div>
  )
}
