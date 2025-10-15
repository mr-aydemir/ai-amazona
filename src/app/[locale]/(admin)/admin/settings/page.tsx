"use client"

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

const supported = ['TRY', 'USD', 'EUR', 'GBP']

export default function AdminSettingsPage() {
  const t = useTranslations('admin.settings.currency')
  const tNotif = useTranslations('admin.settings.notifications.order_emails')
  const locale = useLocale()
  const [baseCurrency, setBaseCurrency] = useState<string>('TRY')
  const [refreshDays, setRefreshDays] = useState<number>(1)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [vatRate, setVatRate] = useState<number>(0.1)
  const [shippingFlatFee, setShippingFlatFee] = useState<number>(10)
  const [showPricesInclVat, setShowPricesInclVat] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [updatingRates, setUpdatingRates] = useState<boolean>(false)
  const { toast } = useToast()

  // Order notification emails state
  const [orderEmails, setOrderEmails] = useState<{ id: string, email: string, active: boolean }[]>([])
  const [newEmail, setNewEmail] = useState<string>('')
  const [addingEmail, setAddingEmail] = useState<boolean>(false)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)

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
        if (typeof json?.showPricesInclVat === 'boolean') setShowPricesInclVat(json.showPricesInclVat)
      } catch (e) {
        // noop
      }
      try {
        const resEmails = await fetch('/api/admin/order-notify-emails')
        if (resEmails.ok) {
          const jsonEmails = await resEmails.json()
          setOrderEmails(jsonEmails || [])
        }
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
        body: JSON.stringify({ baseCurrency, currencyRefreshDays: refreshDays, vatRate, shippingFlatFee, showPricesInclVat }),
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

  async function addOrderEmail() {
    const email = (newEmail || '').trim()
    if (!email) return
    setAddingEmail(true)
    try {
      const res = await fetch('/api/admin/order-notify-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) throw new Error('add_failed')
      const created = await res.json()
      setOrderEmails(prev => [created, ...prev])
      setNewEmail('')
      toast({ title: tNotif('added') })
    } catch (e) {
      toast({ title: tNotif('error') })
    } finally {
      setAddingEmail(false)
    }
  }

  async function removeOrderEmail(email: string) {
    setRemovingEmail(email)
    try {
      const res = await fetch('/api/admin/order-notify-emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) throw new Error('delete_failed')
      setOrderEmails(prev => prev.filter(e => e.email !== email))
      toast({ title: tNotif('deleted') })
    } catch (e) {
      toast({ title: tNotif('error') })
    } finally {
      setRemovingEmail(null)
    }
  }

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

      {/* Order Notification Emails */}
      <Card className="p-4 space-y-4 mt-6">
        <div>
          <h2 className="text-lg font-semibold">{tNotif('title')}</h2>
          <p className="text-sm text-muted-foreground">{tNotif('description')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            className="w-80"
            placeholder={tNotif('email_placeholder')}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Button onClick={addOrderEmail} disabled={addingEmail || !newEmail.trim()}>
            {tNotif('add_button')}
          </Button>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">{tNotif('list_title')}</h3>
          {orderEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tNotif('empty')}</p>
          ) : (
            <ul className="space-y-2">
              {orderEmails.map((it) => (
                <li key={it.id} className="flex items-center justify-between border rounded px-3 py-2">
                  <span>{it.email}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeOrderEmail(it.email)}
                    disabled={removingEmail === it.email}
                  >
                    {tNotif('remove')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}