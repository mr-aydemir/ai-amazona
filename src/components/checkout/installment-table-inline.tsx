'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useCurrency } from '@/components/providers/currency-provider'
import Image from 'next/image'

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

export function InstallmentTableInline({ price }: { price: number }) {
  const t = useTranslations('installments')
  const locale = useLocale()
  const { displayCurrency } = useCurrency()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<InstallmentDetail[]>([])

  const fmt = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency }).format(amount)

  useEffect(() => {
    let cancelled = false
      ; (async () => {
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
  }, [price, displayCurrency])

  const groupedByFamily = useMemo(() => {
    const norm = (s?: string) => (s || 'diger')
      .toLowerCase()
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '')
    const groups: Record<string, {
      name: string
      rows: Array<{ installmentNumber: number, installmentPrice: number, totalPrice: number }>
    }> = {}
    for (const d of details) {
      const key = norm(d.cardFamilyName || d.bankName || 'Diğer')
      const name = d.cardFamilyName || d.bankName || 'Diğer'
      if (!groups[key]) groups[key] = { name, rows: [] }
      for (const ip of d.installmentPrices || []) {
        groups[key].rows.push({
          installmentNumber: ip.installmentNumber,
          installmentPrice: ip.installmentPrice,
          totalPrice: ip.totalPrice,
        })
      }
      groups[key].rows.sort((a, b) => a.installmentNumber - b.installmentNumber)
    }
    return groups
  }, [details])

  const familyImage = (key: string) => {
    const map: Record<string, string> = {
      bonus: '/images/iyzico/bonus.jpg',
      maximum: '/images/iyzico/maximum.jpg',
      axess: '/images/iyzico/axess.jpg',
      world: '/images/iyzico/world.jpg',
      paraf: '/images/iyzico/paraf.jpg',
      cardfinans: '/images/iyzico/cardFinans.jpg',
      ziraatbankasi: '/images/iyzico/ziraatBankası.jpg',
      qnbcc: '/images/iyzico/qnb cc.png',
    }
    return map[key] || ''
  }

  if (loading) return <div className='py-4 text-sm text-muted-foreground'>{t('loadingOptions', { default: 'Taksit seçenekleri yükleniyor...' })}</div>
  if (error) return <div className='py-2 text-sm text-red-600'>{error}</div>

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {Object.entries(groupedByFamily).map(([key, group]) => (
        <div key={`family-${key}`} className='border rounded-md'>
          <div className='flex items-center justify-center gap-3 p-3 border-b bg-muted/50'>
            {familyImage(key) ? (
              <div className='relative h-8 w-32'>
                <Image src={familyImage(key)} alt={group.name} fill className='object-contain' />
              </div>
            ) : (
              <div className='text-sm font-semibold'>{group.name}</div>
            )}
          </div>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='bg-muted'>
                  <th className='text-left p-2'>Taksit Sayısı</th>
                  <th className='text-right p-2'>Taksit Tutarı</th>
                  <th className='text-right p-2'>Toplam Tutar</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row, idx) => (
                  <tr key={`row-${key}-${idx}`} className='border-t'>
                    <td className='p-2'>{row.installmentNumber === 1 ? t('singlePayment', { default: 'Tek Çekim' }) : `${row.installmentNumber}`}</td>
                    <td className='p-2 text-right'>{fmt(row.installmentPrice)}</td>
                    <td className='p-2 text-right font-medium'>{fmt(row.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}