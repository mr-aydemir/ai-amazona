'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
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
}

export function ProductSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('products.catalog')
  const locale = useLocale()
  const [categories, setCategories] = useState<Category[]>([])
  const [priceRange, setPriceRange] = useState([0, 1000])
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

  const handleFilter = () => {
    const params = new URLSearchParams()
    if (selectedCategory && selectedCategory !== 'all')
      params.set('category', selectedCategory)
    if (selectedSort && selectedSort !== 'default')
      params.set('sort', selectedSort)
    params.set('minPrice', priceRange[0].toString())
    params.set('maxPrice', priceRange[1].toString())

    router.push(`/products?${params.toString()}`)
  }

  const handleReset = () => {
    setSelectedCategory('all')
    setSelectedSort('default')
    setPriceRange([0, 1000])
    router.push('/products')
  }

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
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <Label>{t('filters.price_range')}</Label>
        <div className='pt-2'>
          <Slider
            value={priceRange}
            min={0}
            max={1000}
            step={10}
            onValueChange={setPriceRange}
          />
        </div>
        <div className='flex justify-between text-sm'>
          <span>${priceRange[0]}</span>
          <span>${priceRange[1]}</span>
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
        <Button onClick={handleFilter} className='w-full'>
          {t('filters.apply_filters')}
        </Button>
        <Button onClick={handleReset} variant='outline' className='w-full'>
          {t('filters.clear_all')}
        </Button>
      </div>
    </div>
  )
}
