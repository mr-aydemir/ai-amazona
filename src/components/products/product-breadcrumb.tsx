'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useEffect, useState } from 'react'

interface Category {
  id: string
  name: string
  slug?: string
  parent?: Category
}

interface Product {
  id: string
  name: string
  category: Category
  // Optional: translations array when provided by API response
  translations?: { locale: string; name: string }[]
}

interface ProductBreadcrumbProps {
  product: Product
  locale: string
}

export function ProductBreadcrumb({ product, locale }: ProductBreadcrumbProps) {
  const [categoryHierarchy, setCategoryHierarchy] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Prefer translated product name when available (exact or base-locale)
  const displayProductName = (() => {
    // API tarafında product.name localee uygun şekilde normalize edildi.
    // Bu nedenle öncelik product.name; çeviri dizisine yalnızca name boşsa düşelim.
    const baseName = (product as any)?.name
    if (baseName && String(baseName).trim()) return baseName
    const translations = (product as any)?.translations as ({ locale: string; name: string }[] | undefined)
    if (Array.isArray(translations) && translations.length > 0) {
      const base = String(locale || '').split('-')[0]
      const exact = translations.find(t => t.locale === locale)?.name
      if (exact && exact.trim()) return exact
      const baseMatch = translations.find(t => t.locale === base)?.name
      if (baseMatch && baseMatch.trim()) return baseMatch
    }
    return baseName || ''
  })()

  useEffect(() => {
    const fetchCategoryHierarchy = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/categories/hierarchy/${product.category.id}?locale=${locale}`)
        if (response.ok) {
          const data = await response.json()
          const items = Array.isArray(data?.hierarchy) ? data.hierarchy : []
          setCategoryHierarchy(items.length ? items : [product.category])
        } else {
          // Fallback: use only the current category
          setCategoryHierarchy([product.category])
        }
      } catch (error) {
        console.error('Error fetching category hierarchy:', error)
        // Fallback: use only the current category
        setCategoryHierarchy([product.category])
      } finally {
        setLoading(false)
      }
    }

    fetchCategoryHierarchy()
  }, [product.category.id, locale])

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  console.log(product)
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {/* Ana Sayfa */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/${locale}`} className="flex items-center">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator>
          <ChevronRight className="h-4 w-4" />
        </BreadcrumbSeparator>

        {/* Ürünler */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/${locale}/products`}>
              {locale === 'tr' ? 'Ürünler' : 'Products'}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Kategori Hiyerarşisi */}
        {categoryHierarchy.map((category, index) => (
          <div key={category.id} className="flex items-center">
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${locale}/products?category=${encodeURIComponent(category.slug ?? category.id)}`}>
                  {category.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </div>
        ))}

        {/* Ürün */}
        <BreadcrumbSeparator>
          <ChevronRight className="h-4 w-4" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage className="font-medium">
            {displayProductName}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}