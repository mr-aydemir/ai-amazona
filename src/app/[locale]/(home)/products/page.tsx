import { headers } from 'next/headers'
import { ProductSidebar } from '@/components/products/product-sidebar'
import { ProductGridClient } from '@/components/products/product-grid-client'
import { ProductSearchBar } from '@/components/products/product-search-bar'

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const sp = await searchParams
  const pageParam = (typeof sp.page === 'string' ? sp.page : Array.isArray(sp.page) ? sp.page[0] : undefined) || '1'
  const currentPage = Math.max(1, parseInt(pageParam || '1'))
  const limit = 12

  const category = typeof sp.category === 'string' ? sp.category : undefined
  const search = typeof sp.search === 'string' ? sp.search : undefined
  const minPrice = typeof sp.minPrice === 'string' ? parseFloat(sp.minPrice) : undefined
  const maxPrice = typeof sp.maxPrice === 'string' ? parseFloat(sp.maxPrice) : undefined
  const sort = typeof sp.sort === 'string' ? sp.sort : 'default'

  const paramsObj: Record<string, string> = {
    page: String(currentPage),
    limit: String(limit),
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
    ...(minPrice !== undefined ? { minPrice: String(minPrice) } : {}),
    ...(maxPrice !== undefined ? { maxPrice: String(maxPrice) } : {}),
    ...(sort ? { sort } : {}),
  }

  const paramsStr = new URLSearchParams(paramsObj).toString()
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  const res = await fetch(`${baseUrl}/api/products/${locale}?${paramsStr}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Ürünler API isteği başarısız oldu')
  }

  let vatRate: number | undefined
  let showInclVat: boolean | undefined
  try {
    const settingsRes = await fetch(`${baseUrl}/api/admin/currency`, { cache: 'no-store' })
    if (settingsRes.ok) {
      const settings = await settingsRes.json()
      vatRate = typeof settings?.vatRate === 'number' ? settings.vatRate : undefined
      showInclVat = typeof settings?.showPricesInclVat === 'boolean' ? settings.showPricesInclVat : undefined
    }
  } catch {
    // ignore
  }
  const data = await res.json()
  const products = data.products ?? []
  const totalPages = Math.ceil((data.total ?? 0) / (data.perPage ?? limit))

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex flex-col md:flex-row gap-8'>
        <aside className='w-full md:w-64'>
          <ProductSidebar />
        </aside>
        <main className='flex-1'>
          <ProductSearchBar />
          <ProductGridClient
            locale={locale}
            products={products}
            currentPage={currentPage}
            totalPages={totalPages}
            query={{
              ...(category ? { category } : {}),
              ...(search ? { search } : {}),
              ...(minPrice !== undefined ? { minPrice: String(minPrice) } : {}),
              ...(maxPrice !== undefined ? { maxPrice: String(maxPrice) } : {}),
              ...(sort ? { sort } : {}),
            }}
            vatRate={vatRate}
            showInclVat={showInclVat}
          />
        </main>
      </div>
    </div>
  )
}
