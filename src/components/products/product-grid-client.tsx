'use client'

import { useRouter } from 'next/navigation'
import { ProductGrid } from '@/components/products/product-grid'
import { Product } from '@prisma/client'

type ProductGridClientProps = {
  locale: string
  products: Product[]
  currentPage: number
  totalPages: number
  query: Record<string, string>
  vatRate?: number
  showInclVat?: boolean
}

export function ProductGridClient({
  locale,
  products,
  currentPage,
  totalPages,
  query,
  vatRate,
  showInclVat
}: ProductGridClientProps) {
  const router = useRouter()

  const onPageChange = (page: number) => {
    const params = new URLSearchParams({ ...query, page: String(page) })
    router.push(`/${locale}/products?${params.toString()}`)
  }

  return (
    <ProductGrid
      products={products}
      loading={false}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      vatRate={vatRate}
      showInclVat={showInclVat}
    />
  )
}