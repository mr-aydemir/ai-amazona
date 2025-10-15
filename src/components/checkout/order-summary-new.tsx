'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'
import { useCurrency } from '@/components/providers/currency-provider'
import { useEffect, useState } from 'react'

interface OrderItemLite {
  id: string
  name: string
  quantity: number
  price: number
  image?: string
}

interface OrderSummaryNewProps {
  items: OrderItemLite[]
  currency?: string
  taxRate: number
  selectedInstallment?: { installmentCount: number } | null
  serviceFee?: number
}

export function OrderSummaryNew({ items, currency, taxRate, selectedInstallment, serviceFee = 0 }: OrderSummaryNewProps) {
  const t = useTranslations('order')
  const locale = useLocale()
  const { baseCurrency, displayCurrency, rates } = useCurrency()
  const targetCurrency = currency || displayCurrency
  const fmt = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: targetCurrency }).format(amount)
  const [shippingFlatFee, setShippingFlatFee] = useState<number>(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(0)

  const convertToTarget = (amount: number, fromCurrency: string = baseCurrency) => {
    const rateFrom = rates[fromCurrency] ?? rates[baseCurrency] ?? 1
    const rateTarget = rates[targetCurrency] ?? rateFrom
    const ratio = rateTarget / rateFrom
    return amount * ratio
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * taxRate
  const extraFeeBase = selectedInstallment && selectedInstallment.installmentCount > 1 ? serviceFee : 0
  const subtotalInclVat = subtotal + tax
  const shipping = subtotalInclVat >= freeShippingThreshold && freeShippingThreshold > 0 ? 0 : shippingFlatFee
  const grandTotal = subtotal + tax + extraFeeBase + shipping

  // Load shipping price from system settings
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const res = await fetch('/api/admin/currency', { cache: 'no-store' })
          if (!res.ok) return
          const data = await res.json()
          if (cancelled) return
          if (typeof data.shippingFlatFee === 'number') setShippingFlatFee(data.shippingFlatFee)
          if (typeof data.freeShippingThreshold === 'number') setFreeShippingThreshold(data.freeShippingThreshold)
        } catch (e) {
          // keep default 0
        }
      })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {(items || []).map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 relative rounded-md overflow-hidden bg-muted">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                ) : null}
              </div>
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">{t('quantity', { default: 'Adet' })}: {item.quantity}</div>
              </div>
            </div>
            <div className="text-sm font-medium">{fmt(convertToTarget(item.price * item.quantity))}</div>
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>{t('subtotal', { default: 'Ara Toplam' })}</span>
          <span>{fmt(convertToTarget(subtotal))}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>{t('tax', { default: 'Vergi' })}</span>
          <span>{fmt(convertToTarget(tax))}</span>
        </div>
        {extraFeeBase > 0 && (
          <div className="flex justify-between text-sm">
            <span>{t('serviceFee', { default: 'Ek Hizmet Bedeli' })}</span>
            <span>{fmt(convertToTarget(extraFeeBase))}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span>{t('shipping', { default: 'Kargo Bedeli' })}</span>
          <span>{fmt(convertToTarget(shipping))}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-medium">
          <span>{t('total', { default: 'Toplam' })}</span>
          <span>{fmt(convertToTarget(grandTotal))}</span>
        </div>
      </div>
    </div>
  )
}