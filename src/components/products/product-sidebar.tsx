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

export function ProductSidebar({ vatRate: vatRateProp, showInclVat: showInclVatProp }: { vatRate?: number; showInclVat?: boolean }) {
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
    toDisplay(Number(searchParams.get('minPrice') ?? 0)),
    toDisplay(Number(searchParams.get('maxPrice') ?? 0)),
  ])
  const [hasMin, setHasMin] = useState<boolean>(initialMinPresent)
  const [hasMax, setHasMax] = useState<boolean>(initialMaxPresent)
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  )
  const [selectedSort, setSelectedSort] = useState(
    searchParams.get('sort') || 'default'
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

      // fiyat aralığı (URL’e baz para birimi ile yaz)
      const minBase = Math.round(toBase(priceRange[0]) * 100) / 100
      const maxBase = Math.round(toBase(priceRange[1]) * 100) / 100
      if (hasMin) {
        params.set('minPrice', minBase.toString())
      } else {
        params.delete('minPrice')
      }
      if (hasMax) {
        params.set('maxPrice', maxBase.toString())
      } else {
        params.delete('maxPrice')
      }

      // filtre değişince sayfayı 1'e çek
      params.set('page', '1')

      router.push(`/${locale}/products?${params.toString()}`)
    }, 350)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedSort, priceRange])

  const handleReset = () => {
    setSelectedCategory('all')
    setSelectedSort('default')
    setPriceRange([toDisplay(0), toDisplay(0)])
    setHasMin(false)
    setHasMax(false)
    router.push(`/${locale}/products`)
  }

  // Para birimi değişince URL'deki baz değerlerden slider'ı yeniden hesapla
  useEffect(() => {
    const minBase = Number(searchParams.get('minPrice') ?? 0)
    const maxBase = Number(searchParams.get('maxPrice') ?? 0)
    setPriceRange([toDisplay(minBase), toDisplay(maxBase)])
    setHasMin(searchParams.has('minPrice'))
    setHasMax(searchParams.has('maxPrice'))
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
