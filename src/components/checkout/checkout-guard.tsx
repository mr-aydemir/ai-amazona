'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/store/use-cart'
import { useLocale } from 'next-intl'

export default function CheckoutGuard() {
  const { items } = useCart()
  const router = useRouter()
  const locale = useLocale()

  useEffect(() => {
    if (!items || items.length === 0) {
      router.replace(`/${locale}/cart`)
    }
  }, [items, router, locale])

  return null
}