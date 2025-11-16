'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useCurrency } from '@/components/providers/currency-provider'
import { formatCurrency } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Category {
  id: string
  name: string
  slug?: string | null
}

type AttrOpt = { id: string; key: string | null; name: string }
type AttrDef = { id: string; key: string; type: string; unit?: string | null; isRequired: boolean; name: string; options: AttrOpt[] }
export function ProductSidebar({ vatRate: vatRateProp, showInclVat: showInclVatProp, attributes = [] as AttrDef[] }: { vatRate?: number; showInclVat?: boolean; attributes?: AttrDef[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('products.catalog')
  const locale = useLocale()
  const { baseCurrency, displayCurrency, rates } = useCurrency()
  const [categories, setCategories] = useState<Category[]>([])
  // Dönüşüm oranı: display / base
  const baseRate = rates[baseCurrency] ?? 1
  const displayRate = rates[displayCurrency] ?? baseRate
  const ratio = displayRate / baseRate
  const vatRate = typeof vatRateProp === 'number' ? vatRateProp : 0
  const showInclVat = !!showInclVatProp
  const vatFactor = showInclVat ? (1 + vatRate) : 1
  const toDisplay = (amountBase: number) => amountBase * vatFactor * ratio
  const toBase = (amountDisplay: number) => (amountDisplay / ratio) / vatFactor
  const initialMinPresent = searchParams.has('minPrice')
  const initialMaxPresent = searchParams.has('maxPrice')
  const [priceRange, setPriceRange] = useState([
    Number(searchParams.get('minPrice') ?? 0),
    Number(searchParams.get('maxPrice') ?? 0),
  ])
  const [hasMin, setHasMin] = useState<boolean>(initialMinPresent)
  const [hasMax, setHasMax] = useState<boolean>(initialMaxPresent)
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  )
  const [selectedSort, setSelectedSort] = useState(
    searchParams.get('sort') || 'default'
  )
  // Atribut filtreleri başlangıç değerleri
  const getAttrInitialValue = (attr: AttrDef): string => {
    const raw = searchParams.get(`attr_${attr.id}`)
    return raw ?? ''
  }
  const [attrValues, setAttrValues] = useState<Record<string, string>>(
    Object.fromEntries((attributes || []).map((a) => [a.id, getAttrInitialValue(a)]))
  )

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`/api/categories/${locale}`)
        if (response.ok) {
          const data = await response.json()
          setCategories(data)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }

    fetchCategories()
  }, [locale])

  // Otomatik filtre uygulama (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Geçersiz aralıksa URL güncellemesini atla
      if (priceRange[0] > priceRange[1]) return
      const params = new URLSearchParams(searchParams.toString())

      // kategori
      // If selectedCategory looks like an ID, keep behavior; otherwise use slug value
      if (selectedCategory && selectedCategory !== 'all') {
        params.set('category', selectedCategory)
      } else {
        params.delete('category')
      }

      // sıralama
      if (selectedSort && selectedSort !== 'default') {
        params.set('sort', selectedSort)
      } else {
        params.delete('sort')
      }

      // fiyat aralığı (URL’e görüntü değeri ile yaz)
      const minDisplay = priceRange[0]
      const maxDisplay = priceRange[1]
      if (hasMin) {
        params.set('minPrice', minDisplay.toString())
      } else {
        params.delete('minPrice')
      }
      if (hasMax) {
        params.set('maxPrice', maxDisplay.toString())
      } else {
        params.delete('maxPrice')
      }

      // atribut filtrelerini yaz
      Object.entries(attrValues).forEach(([attrId, val]) => {
        const key = `attr_${attrId}`
        if (val && String(val).length > 0 && val !== 'ALL') params.set(key, String(val))
        else params.delete(key)
      })

      // filtre değişince sayfayı 1'e çek
      params.set('page', '1')

      router.push(`/${locale}/products?${params.toString()}`)
    }, 350)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedSort, priceRange, attrValues])

  const handleReset = () => {
    setSelectedCategory('all')
    setSelectedSort('default')
    setPriceRange([toDisplay(0), toDisplay(0)])
    setHasMin(false)
    setHasMax(false)
    setAttrValues(Object.fromEntries((attributes || []).map((a) => [a.id, ''])))
    router.push(`/${locale}/products`)
  }

  // Para birimi değişince URL'deki değerlerden slider'ı yeniden hesapla
  useEffect(() => {
    const minDisplay = Number(searchParams.get('minPrice') ?? 0)
    const maxDisplay = Number(searchParams.get('maxPrice') ?? 0)
    setPriceRange([minDisplay, maxDisplay])
    setHasMin(searchParams.has('minPrice'))
    setHasMax(searchParams.has('maxPrice'))
    setAttrValues(Object.fromEntries((attributes || []).map((a) => [a.id, getAttrInitialValue(a)])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCurrency])

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <Label>{t('filters.categories')}</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder={t('filters.categories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('filters.all_categories')}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.slug || category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <Label>{t('filters.price_range')}</Label>
        <div className='grid grid-cols-2 gap-2 pt-2'>
          <div className='space-y-1'>
            <Label className='text-xs'>{t('filters.min_price')}</Label>
            <Input
              type='number'
              inputMode='numeric'
              step={1}
              min={0}
              value={hasMin ? Math.round(priceRange[0]) : ''}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  setHasMin(false)
                  setPriceRange([0, priceRange[1]])
                  return
                }
                const v = parseFloat(raw)
                setHasMin(true)
                setPriceRange([isNaN(v) ? 0 : v, priceRange[1]])
              }}
              aria-label={t('filters.min_price')}
              placeholder={formatCurrency(toDisplay(0), displayCurrency, locale)}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs'>{t('filters.max_price')}</Label>
            <Input
              type='number'
              inputMode='numeric'
              step={1}
              min={0}
              value={hasMax ? Math.round(priceRange[1]) : ''}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  setHasMax(false)
                  setPriceRange([priceRange[0], 0])
                  return
                }
                const v = parseFloat(raw)
                setHasMax(true)
                setPriceRange([priceRange[0], isNaN(v) ? 0 : v])
              }}
              aria-label={t('filters.max_price')}
              placeholder={formatCurrency(toDisplay(0), displayCurrency, locale)}
            />
          </div>
        </div>
      </div>

      {attributes && attributes.length > 0 ? (
        <div className='space-y-4'>
          <Label>Özellikler</Label>
          {attributes.map((attr) => (
            <div key={attr.id} className='space-y-1'>
              <Label className='text-xs'>{attr.name}</Label>
              {attr.type === 'SELECT' ? (
                <Select
                  value={attrValues[attr.id] || ''}
                  onValueChange={(v) => setAttrValues((prev) => ({ ...prev, [attr.id]: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={attr.name} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ALL'>Tümü</SelectItem>
                    {attr.options.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : attr.type === 'BOOLEAN' ? (
                <Select
                  value={attrValues[attr.id] || ''}
                  onValueChange={(v) => setAttrValues((prev) => ({ ...prev, [attr.id]: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={attr.name} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ALL'>Tümü</SelectItem>
                    <SelectItem value='true'>Var</SelectItem>
                    <SelectItem value='false'>Yok</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={attr.type === 'NUMBER' ? 'number' : 'text'}
                  inputMode={attr.type === 'NUMBER' ? 'numeric' : 'text'}
                  value={attrValues[attr.id] || ''}
                  onChange={(e) => setAttrValues((prev) => ({ ...prev, [attr.id]: e.target.value }))}
                  placeholder={attr.name}
                />
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className='space-y-2'>
        <Label>{t('sort_by')}</Label>
        <Select value={selectedSort} onValueChange={setSelectedSort}>
          <SelectTrigger>
            <SelectValue placeholder={t('sort_by')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='default'>{t('sort_options.newest')}</SelectItem>
            <SelectItem value='price_asc'>{t('sort_options.price_low_high')}</SelectItem>
            <SelectItem value='price_desc'>{t('sort_options.price_high_low')}</SelectItem>
            <SelectItem value='name_asc'>{t('sort_options.name_a_z')}</SelectItem>
            <SelectItem value='name_desc'>{t('sort_options.name_z_a')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <Button onClick={handleReset} variant='outline' className='w-full'>
          {t('filters.clear_all')}
        </Button>
      </div>
    </div>
  )
}
