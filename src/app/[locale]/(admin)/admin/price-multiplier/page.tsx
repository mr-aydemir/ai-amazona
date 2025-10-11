'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
// tablo yerine kart grid kullanılacak
import { ProductCard } from '@/components/ui/product-card'

export default function AdminPriceMultiplierPage() {
  const locale = useLocale()
  const { toast } = useToast()
  const [multiplier, setMultiplier] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [listLoading, setListLoading] = useState<boolean>(false)
  const [items, setItems] = useState<Array<{ id: string, name: string, price: number, stock: number, status: string, image?: string }>>([])

  useEffect(() => {
    const load = async () => {
      setListLoading(true)
      try {
        const res = await fetch(`/api/admin/products/list?limit=50&locale=${locale}`)
        const data = await res.json()
        if (!res.ok) throw new Error(String(data?.error || 'Liste başarısız'))
        setItems(data.items || [])
      } catch (err: any) {
        toast({ title: 'Hata', description: String(err?.message || err || 'Liste başarısız') })
      } finally {
        setListLoading(false)
      }
    }
    load()
  }, [locale])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      toast({ title: 'Geçerli bir çarpan giriniz (0’dan büyük sayı)' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products/bulk-price-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(String(data?.error || 'İşlem başarısız'))
      }
      toast({ title: 'Fiyatlar güncellendi', description: `Toplam ${data.total} ürün, güncellenen: ${data.updated}` })
    } catch (err: any) {
      toast({ title: 'Hata', description: String(err?.message || err || 'İşlem başarısız') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='container mx-auto py-8'>
      <div className='flex flex-col gap-6'>
        <div>
          <h1 className='text-3xl font-bold'>Toplu Fiyat Güncelleme</h1>
          <p className='text-muted-foreground mt-1'>Sistemdeki tüm ürünlerin fiyatını belirttiğiniz çarpan ile günceller.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Çarpan Ayarı</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='grid gap-2 max-w-sm'>
                <Label htmlFor='multiplier'>Çarpan</Label>
                <input
                  id='multiplier'
                  type='number'
                  step='0.01'
                  min='0.01'
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                  className='h-9 rounded-md border bg-background px-2 text-sm'
                  placeholder='Örn: 1.10'
                />
              </div>
              <div className='flex items-center gap-4'>
                <Button type='submit' disabled={loading}>
                  {loading ? 'Güncelleniyor...' : 'Fiyatları Güncelle'}
                </Button>
                <span className='text-sm text-muted-foreground'>Bu işlem tüm ürünlerin fiyatını kalıcı olarak değiştirecektir.</span>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>İlk 50 Ürün</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between mb-4'>
              <span className='text-sm text-muted-foreground'>Son eklenenlerden başlayarak ilk 50 ürün kart şeklinde listelenir.</span>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={listLoading}
                onClick={async () => {
                  setListLoading(true)
                  try {
                    const res = await fetch(`/api/admin/products/list?limit=50&locale=${locale}`)
                    const data = await res.json()
                    if (!res.ok) throw new Error(String(data?.error || 'Liste başarısız'))
                    setItems(data.items || [])
                  } catch (err: any) {
                    toast({ title: 'Hata', description: String(err?.message || err || 'Liste başarısız') })
                  } finally {
                    setListLoading(false)
                  }
                }}
              >
                {listLoading ? 'Yükleniyor...' : 'Yenile'}
              </Button>
            </div>
            {items.length === 0 && (
              <div className='text-center text-muted-foreground'>Liste boş. Yenile ile tekrar deneyin.</div>
            )}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {items.map((p) => {
                const product = {
                  id: p.id,
                  name: p.name,
                  description: '',
                  price: p.price,
                  images: [p.image || '/images/placeholder.jpg'],
                }
                return (
                  <ProductCard
                    key={p.id}
                    product={product as any}
                    vatRate={0}
                    showInclVat={false}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}