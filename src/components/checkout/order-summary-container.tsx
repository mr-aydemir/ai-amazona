'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLocale } from 'next-intl'
import { OrderSummaryNew } from './order-summary-new'
import type { OrderItem, Product, Category } from '@prisma/client'
import { useCurrency } from '@/components/providers/currency-provider'

interface OrderSummaryContainerProps {
  orderItems: (OrderItem & {
    product: Product & {
      category: Category
    }
  })[]
  orderTotal: number
  orderCurrency?: string
}

export function OrderSummaryContainer({ orderItems, orderTotal, orderCurrency }: OrderSummaryContainerProps) {
  const [selectedInstallment, setSelectedInstallment] = useState<{
    installmentCount: number
    installmentPrice: number
    totalPrice: number
    currency?: string
  } | null>(null)
  const [vatRate, setVatRate] = useState<number>(0.1)
  const { baseCurrency, displayCurrency, rates } = useCurrency()
  const locale = useLocale()
  const [translatedNames, setTranslatedNames] = useState<Record<string, string>>({})

  // Listen for installment changes from the payment component
  useEffect(() => {
    const handleInstallmentChange = (event: CustomEvent) => {
      setSelectedInstallment(event.detail)
    }

    window.addEventListener('installmentChange', handleInstallmentChange as EventListener)

    return () => {
      window.removeEventListener('installmentChange', handleInstallmentChange as EventListener)
    }
  }, [])

  // Load VAT rate from system settings
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/currency', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (typeof data.vatRate === 'number') setVatRate(data.vatRate)
      } catch (e) {
        // keep defaults
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Fetch localized product names for current locale (client-side)
  useEffect(() => {
    if (!orderItems || orderItems.length === 0) return

    const uniqueIds = Array.from(new Set(orderItems.map(i => i.product.id)))
    let cancelled = false

    Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const res = await fetch(`/api/products/${locale}/${id}`)
          if (!res.ok) return null
          const data = await res.json()
          return { id, name: (data?.name as string) || null }
        } catch (e) {
          return null
        }
      })
    ).then(results => {
      if (cancelled) return
      const map: Record<string, string> = {}
      for (const r of results) {
        if (r && r.name) {
          map[r.id] = r.name
        }
      }
      setTranslatedNames(map)
    })

    return () => { cancelled = true }
  }, [orderItems, locale])

  const itemsLite = useMemo(() => {
    return (orderItems || []).map((it) => {
      let imgs: string[] = []
      try {
        imgs = Array.isArray((it as any).product?.images)
          ? (it as any).product.images as string[]
          : JSON.parse(((it as any).product?.images || '[]') as string)
      } catch {
        imgs = []
      }
      return {
        id: it.id,
        name: translatedNames[it.product.id] ?? it.product.name,
        quantity: it.quantity,
        price: it.price,
        image: imgs[0] || '/images/placeholder.jpg',
      }
    })
  }, [orderItems, translatedNames])

  const subtotal = useMemo(() => itemsLite.reduce((sum, it) => sum + it.price * it.quantity, 0), [itemsLite])
  const tax = useMemo(() => subtotal * vatRate, [subtotal, vatRate])
  const serviceFee = useMemo(() => {
    if (!selectedInstallment || selectedInstallment.installmentCount <= 1) return 0
    // Taksit toplamı farklı para birimindeyse önce taban (base) para birimine çevir
    const rateFrom = selectedInstallment.currency ? (rates[selectedInstallment.currency] ?? rates[baseCurrency] ?? 1) : rates[baseCurrency] ?? 1
    const rateBase = rates[baseCurrency] ?? 1
    const toBaseRatio = rateBase / rateFrom
    const installmentTotalBase = selectedInstallment.totalPrice * toBaseRatio
    // Yaklaşık ek hizmet bedeli: taksit toplamı (base) - (ara toplam + vergi) (base)
    const diff = installmentTotalBase - (subtotal + tax)
    return diff > 0 ? diff : 0
  }, [selectedInstallment, subtotal, tax, rates, baseCurrency])

  return (
    <OrderSummaryNew
      items={itemsLite}
      currency={orderCurrency || displayCurrency}
      taxRate={vatRate}
      selectedInstallment={selectedInstallment ? { installmentCount: selectedInstallment.installmentCount } : null}
      serviceFee={serviceFee}
    />
  )
}