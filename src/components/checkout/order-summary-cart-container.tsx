'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCart } from '@/store/use-cart'
import { useCurrency } from '@/components/providers/currency-provider'
import { OrderSummaryNew } from './order-summary-new'

export function OrderSummaryCartContainer() {
  const { items } = useCart()
  const { displayCurrency } = useCurrency()
  const [vatRate, setVatRate] = useState<number>(0.1)
  const [shippingFlatFee, setShippingFlatFee] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const res = await fetch('/api/admin/currency', { cache: 'no-store' })
          if (!res.ok) return
          const data = await res.json()
          if (cancelled) return
          if (typeof data.vatRate === 'number') setVatRate(data.vatRate)
          if (typeof data.shippingFlatFee === 'number') setShippingFlatFee(data.shippingFlatFee)
        } catch {
          // keep defaults
        }
      })()
    return () => { cancelled = true }
  }, [])

  const itemsLite = useMemo(() => {
    return (items || []).map((it) => ({
      id: it.id,
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      image: it.image,
    }))
  }, [items])

  const serviceFee = 0

  return (
    <OrderSummaryNew
      items={itemsLite}
      currency={displayCurrency}
      taxRate={vatRate}
      selectedInstallment={null}
      serviceFee={serviceFee + shippingFlatFee}
    />
  )
}