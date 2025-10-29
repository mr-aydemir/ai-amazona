"use client"

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

interface AdminProductItem {
  id: string
  name: string
  price: number
  stock: number
  status: string
  image: string
}

export default function AdminVariantsPage() {
  const tNav = useTranslations('admin.navigation')
  const locale = useLocale()
  const { toast } = useToast()

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<AdminProductItem[]>([])
  const [primaryId, setPrimaryId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [merging, setMerging] = useState(false)

  const title = useMemo(() => (locale === 'tr' ? 'Varyant Birleştirme' : 'Merge Variants'), [locale])
  const searchPlaceholder = useMemo(() => (locale === 'tr' ? 'Ürün ara...' : 'Search products...'), [locale])
  const mergeLabel = useMemo(() => (locale === 'tr' ? 'Seçilenleri Varyant Olarak Birleştir' : 'Merge Selected as Variants'), [locale])
  const autoMergeLabel = useMemo(() => (locale === 'tr' ? 'Otomatik Grupla ve İsimlendir' : 'Auto Group & Label'), [locale])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(query)}&limit=50&locale=${locale}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || (locale === 'tr' ? 'Ürünler getirilemedi' : 'Failed to load products'))
      }
      const list: AdminProductItem[] = Array.isArray(data?.products)
        ? data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          stock: p.stock,
          status: p.status,
          image: Array.isArray(p.images) ? (p.images[0] ?? '') : '',
        }))
        : []
      setItems(list)
    } catch (e) {
      toast({ variant: 'destructive', title: 'Hata', description: (locale === 'tr' ? 'Ürünler getirilemedi' : 'Failed to load products') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // initial load
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleSelected = (id: string, value: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: value }))
  }

  const handleMerge = async () => {
    const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
    if (!primaryId) {
      toast({ variant: 'destructive', title: 'Hata', description: (locale === 'tr' ? 'Bir ana ürün seçin' : 'Select a primary product') })
      return
    }
    if (selectedIds.length === 0) {
      toast({ variant: 'destructive', title: 'Hata', description: (locale === 'tr' ? 'En az bir ürün seçin' : 'Select at least one product') })
      return
    }
    setMerging(true)
    try {
      const res = await fetch('/api/admin/products/merge-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryProductId: primaryId, variantProductIds: selectedIds, variantLabels: labels }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Merge failed')
      toast({ title: (locale === 'tr' ? 'Varyantlar birleştirildi' : 'Variants merged'), description: (locale === 'tr' ? `Grup: ${json.groupId}` : `Group: ${json.groupId}`) })
      // reset selection
      setSelected({})
      setPrimaryId(null)
      setLabels({})
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Hata', description: e?.message || (locale === 'tr' ? 'İşlem başarısız' : 'Operation failed') })
    } finally {
      setMerging(false)
    }
  }

  const handleAutoMerge = async () => {
    setMerging(true)
    try {
      const res = await fetch('/api/admin/products/auto-merge-variants', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Auto merge failed')
      const desc = locale === 'tr'
        ? `Gruplar: ${json.groupsProcessed}, Etiketlenen: ${json.productsLabeled}`
        : `Groups: ${json.groupsProcessed}, Labeled: ${json.productsLabeled}`
      toast({ title: (locale === 'tr' ? 'Otomatik grupla/isimlendir tamamlandı' : 'Auto group & label completed'), description: desc })
      // refresh list
      fetchProducts()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Hata', description: e?.message || (locale === 'tr' ? 'İşlem başarısız' : 'Operation failed') })
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className='container mx-auto p-4'>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex gap-2'>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} />
            <Button onClick={fetchProducts} disabled={loading}>{locale === 'tr' ? 'Ara' : 'Search'}</Button>
            <Button variant='secondary' onClick={handleAutoMerge} disabled={merging}>
              {autoMergeLabel}
            </Button>
          </div>

          <div className='border rounded-md'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === 'tr' ? 'Birincil' : 'Primary'}</TableHead>
                  <TableHead>{tNav('products')}</TableHead>
                  <TableHead>{locale === 'tr' ? 'Fiyat' : 'Price'}</TableHead>
                  <TableHead>{locale === 'tr' ? 'Stok' : 'Stock'}</TableHead>
                  <TableHead>{locale === 'tr' ? 'Etiket' : 'Label'}</TableHead>
                  <TableHead>{locale === 'tr' ? 'Seç' : 'Select'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='text-center text-muted-foreground'>
                      {loading ? (locale === 'tr' ? 'Yükleniyor...' : 'Loading...') : (locale === 'tr' ? 'Ürün bulunamadı' : 'No products')}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <RadioGroup value={primaryId ?? ''} onValueChange={(v) => setPrimaryId(v)}>
                          <RadioGroupItem value={item.id} id={`primary-${item.id}`} />
                        </RadioGroup>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.image} alt={item.name} className='h-10 w-10 rounded object-cover' />
                          <div>
                            <div className='font-medium'>{item.name}</div>
                            <div className='text-xs text-muted-foreground'>{item.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.price}</TableCell>
                      <TableCell>{item.stock}</TableCell>
                      <TableCell>
                        <Input
                          value={labels[item.id] ?? ''}
                          onChange={(e) => setLabels((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder={locale === 'tr' ? 'Örn. Siyah' : 'e.g. Black'}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox checked={!!selected[item.id]} onCheckedChange={(v: boolean) => toggleSelected(item.id, !!v)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className='flex justify-end'>
            <Button onClick={handleMerge} disabled={merging}>{mergeLabel}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}