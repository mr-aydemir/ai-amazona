'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useLocale, useTranslations } from 'next-intl'
import { useCurrency } from '@/components/providers/currency-provider'

type InstallmentPrice = {
  installmentPrice: number
  totalPrice: number
  installmentNumber: number
}

type InstallmentDetail = {
  price: number
  cardFamilyName?: string
  force3ds?: number
  bankCode?: number
  bankName?: string
  forceCvc?: number
  installmentPrices: InstallmentPrice[]
}

export function InstallmentTableModal({
  price,
  triggerClassName,
}: {
  price: number
  triggerClassName?: string
}) {
  const t = useTranslations('installments')
  const locale = useLocale()
  const { displayCurrency } = useCurrency()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<InstallmentDetail[]>([])

  const fmt = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency }).format(amount)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/iyzico/installments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price, currency: displayCurrency })
        })
        const json = await res.json()
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || 'Taksit bilgisi alınamadı')
        }
        if (!cancelled) {
          setDetails(json.installmentDetails || [])
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Hata oluştu')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, price, displayCurrency])

  const flatRows = useMemo(() => {
    const rows: Array<{
      bankName: string
      cardFamilyName?: string
      installmentNumber: number
      installmentPrice: number
      totalPrice: number
    }> = []
    for (const d of details) {
      const bank = d.bankName || 'Bank'
      for (const ip of d.installmentPrices || []) {
        rows.push({
          bankName: bank,
          cardFamilyName: d.cardFamilyName,
          installmentNumber: ip.installmentNumber,
          installmentPrice: ip.installmentPrice,
          totalPrice: ip.totalPrice,
        })
      }
    }
    // Order by installment number asc, then total price asc
    return rows.sort((a, b) => (a.installmentNumber - b.installmentNumber) || (a.totalPrice - b.totalPrice))
  }, [details])

  return (
    <>
      <Button variant='outline' size='sm' className={triggerClassName} onClick={() => setOpen(true)}>
        {t('showTable', { default: 'Taksit Tablosu' })}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>{t('installmentTableTitle', { default: 'Taksit Tablosu' })}</DialogTitle>
          </DialogHeader>

          {loading && (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              {t('loading', { default: 'Taksitler yükleniyor...' })}
            </div>
          )}

          {error && (
            <div className='py-4 text-center text-red-600 text-sm'>
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className='overflow-x-auto border rounded-md'>
              <table className='min-w-full text-sm'>
                <thead className='bg-muted'>
                  <tr>
                    <th className='text-left p-2'>Banka</th>
                    <th className='text-left p-2'>Kart Ailesi</th>
                    <th className='text-right p-2'>Taksit</th>
                    <th className='text-right p-2'>Aylık</th>
                    <th className='text-right p-2'>Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {flatRows.map((row, idx) => (
                    <tr key={`inst-row-${idx}`} className='border-t'>
                      <td className='p-2'>{row.bankName}</td>
                      <td className='p-2'>{row.cardFamilyName || '-'}</td>
                      <td className='p-2 text-right'>{row.installmentNumber === 1 ? t('singlePayment', { default: 'Tek Çekim' }) : row.installmentNumber}</td>
                      <td className='p-2 text-right'>{fmt(row.installmentPrice)}</td>
                      <td className='p-2 text-right font-medium'>{fmt(row.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}