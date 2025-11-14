"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ProductSearchBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const t = useTranslations('products.catalog')
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') ?? '')
  const [selectedLimit, setSelectedLimit] = useState<string>(searchParams.get('limit') || '12')

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchTerm && searchTerm.trim().length > 0) {
        params.set('search', searchTerm.trim())
      } else {
        params.delete('search')
      }
      if (selectedLimit) {
        params.set('limit', selectedLimit)
      }
      // arama değiştiğinde sayfayı 1'e çek
      params.set('page', '1')
      router.push(`/${locale}/products?${params.toString()}`)
    }, 400)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedLimit])

  const clearSearch = () => {
    setSearchTerm('')
  }

  return (
    <div className='mb-4'>
      <div className='flex items-center gap-3'>
        <div className='w-28'>
          <Select value={selectedLimit} onValueChange={setSelectedLimit}>
            <SelectTrigger>
              <SelectValue placeholder='Ürün sayısı' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='12'>12</SelectItem>
              <SelectItem value='24'>24</SelectItem>
              <SelectItem value='36'>36</SelectItem>
              <SelectItem value='48'>48</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='relative flex-1 flex items-center gap-2'>
          <div className='absolute left-3 text-muted-foreground'>
            <Search size={18} />
          </div>
          <Input
            aria-label={t('search_placeholder')}
            className='pl-10'
            placeholder={t('search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm ? (
            <Button variant='ghost' size='icon' aria-label='Clear search' onClick={clearSearch}>
              <X size={18} />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}