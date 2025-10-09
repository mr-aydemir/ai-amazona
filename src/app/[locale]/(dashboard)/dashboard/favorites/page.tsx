import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { ProductCard } from '@/components/ui/product-card'
import { getLocale } from 'next-intl/server'

export default async function FavoritesPage() {
  const session = await auth()
  const locale = await getLocale()

  if (!session?.user) {
    redirect(`/${locale}/sign-in`)
  }

  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const cookie = (await headers()).get('cookie') || ''
  const res = await fetch(`${baseUrl}/api/favorites`, {
    cache: 'no-store',
    headers: { cookie },
  })
  if (res.status === 401) {
    redirect(`/${locale}/sign-in`)
  }
  if (!res.ok) {
    throw new Error('Favoriler yüklenemedi')
  }
  const data = await res.json()
  const favorites = Array.isArray(data?.items) ? data.items : []

  const products = favorites.map((fav: any) => {
    const p = fav.product
    const images = Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]')
    return { ...p, images }
  })

  return (
    <div className='space-y-8'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight'>Favorilerim</h2>
        <p className='text-muted-foreground'>Favorilerinize eklediğiniz ürünler</p>
      </div>

      {products.length === 0 ? (
        <p className='text-muted-foreground'>Henüz favori ürününüz yok.</p>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} initialFavorited />
          ))}
        </div>
      )}
    </div>
  )
}