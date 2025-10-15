"use client"

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
// import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

const supported = ['TRY', 'USD', 'EUR', 'GBP']

export default function AdminSettingsPage() {
  const t = useTranslations('admin.settings.currency')
  const locale = useLocale()
  const [baseCurrency, setBaseCurrency] = useState<string>('TRY')
  const [refreshDays, setRefreshDays] = useState<number>(1)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [vatRate, setVatRate] = useState<number>(0.1)
  const [shippingFlatFee, setShippingFlatFee] = useState<number>(10)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(0)
  const [showPricesInclVat, setShowPricesInclVat] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [updatingRates, setUpdatingRates] = useState<boolean>(false)
  const { toast } = useToast()

  // Order notification emails removed per new requirement (admins receive emails)

  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch('/api/admin/currency')
        const json = await res.json()
        if (json?.baseCurrency) setBaseCurrency(json.baseCurrency)
        if (typeof json?.currencyRefreshDays === 'number') setRefreshDays(json.currencyRefreshDays)
        if (json?.lastRatesUpdateAt) setLastUpdated(new Date(json.lastRatesUpdateAt).toLocaleString(locale))
        if (typeof json?.vatRate === 'number') setVatRate(json.vatRate)
        if (typeof json?.shippingFlatFee === 'number') setShippingFlatFee(json.shippingFlatFee)
        if (typeof json?.freeShippingThreshold === 'number') setFreeShippingThreshold(json.freeShippingThreshold)
        if (typeof json?.showPricesInclVat === 'boolean') setShowPricesInclVat(json.showPricesInclVat)
      } catch (e) {
        // noop
      }
    })()
  }, [])

  async function saveBaseCurrency() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/currency', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseCurrency, currencyRefreshDays: refreshDays, vatRate, shippingFlatFee, freeShippingThreshold, showPricesInclVat }),
      })
      if (!res.ok) throw new Error('save_failed')
      toast({ title: t('success') })
    } catch (e) {
      toast({ title: t('error') })
    } finally {
      setLoading(false)
    }
  }

  async function updateRates() {
    setUpdatingRates(true)
    try {
      const res = await fetch('/api/admin/currency', { method: 'POST' })
      if (!res.ok) throw new Error('update_failed')
      toast({ title: t('rates_updated') })
    } catch (e) {
      toast({ title: t('error') })
    } finally {
      setUpdatingRates(false)
    }
  }

  // add/remove order emails functions removed

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('base_label')}</label>
          <Select value={baseCurrency} onValueChange={setBaseCurrency}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supported.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('refresh_days_label', { default: 'Kur güncelleme aralığı (gün)' })}</label>
          <input
            type="number"
            min={1}
            value={refreshDays}
            onChange={(e) => setRefreshDays(Math.max(1, Number(e.target.value)))}
            className="w-64 border rounded px-3 py-2"
          />
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">{t('last_updated', { default: 'Son güncelleme' })}: {lastUpdated}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('vat_label', { default: 'KDV oranı' })}</label>
          <input
            type="number"
            step={0.01}
            min={0}
            value={vatRate}
            onChange={(e) => setVatRate(Math.max(0, Number(e.target.value)))}
            className="w-64 border rounded px-3 py-2"
          />
          <p className="text-xs text-muted-foreground">{t('vat_help', { default: 'Oranı ondalık olarak girin. Örn: 0.18 = %18' })}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('shipping_label', { default: 'Kargo fiyatı' })}</label>
          <input
            type="number"
            step={0.01}
            min={0}
            value={shippingFlatFee}
            onChange={(e) => setShippingFlatFee(Math.max(0, Number(e.target.value)))}
            className="w-64 border rounded px-3 py-2"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('free_shipping_threshold_label', { default: 'Ücretsiz kargo eşiği' })}</label>
          <input
            type="number"
            step={0.01}
            min={0}
            value={freeShippingThreshold}
            onChange={(e) => setFreeShippingThreshold(Math.max(0, Number(e.target.value)))}
            className="w-64 border rounded px-3 py-2"
          />
          <p className="text-xs text-muted-foreground">{t('free_shipping_threshold_help', { default: 'Bu tutarın üzerindeki alışverişlerde kargo ücretsiz olur.' })}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <input
              type="checkbox"
              checked={showPricesInclVat}
              onChange={(e) => setShowPricesInclVat(e.target.checked)}
            />
            {t('show_incl_vat_label', { default: 'Fiyatlar KDV dahil gösterilsin' })}
          </label>
          <p className="text-xs text-muted-foreground">{t('show_incl_vat_help', { default: 'İşaretlenirse ürün ve sepet fiyatları KDV dahil gösterilir.' })}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button disabled={loading} onClick={saveBaseCurrency}>
            {t('save')}
          </Button>
          <Button disabled={updatingRates} variant="outline" onClick={updateRates}>
            {t('update_rates')}
          </Button>
        </div>
      </Card>

      {/* Order Notification Emails section removed */}
    </div>
  )
}