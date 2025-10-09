import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import ReviewModal from '@/components/dashboard/review-modal'
import OrdersFilterList from '@/components/dashboard/orders-filter-list'

type DashboardOrderItem = {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    images: string[]
  }
}

type DashboardOrder = {
  id: string
  createdAt: string
  status: string
  items: DashboardOrderItem[]
  shippingStreet: string
  shippingCity: string
  shippingState: string
  shippingPostalCode: string
  shippingCountry: string
  total: number
  shippingTrackingNumber?: string
  shippingTrackingUrl?: string
  shippingCarrier?: string
}

export default async function OrdersPage() {
  const session = await auth()
  const t = await getTranslations('dashboard.orders')
  const tStatus = await getTranslations('admin.orders.status')
  const tp = await getTranslations('products.reviews')
  const locale = await getLocale()

  if (!session?.user) {
    redirect(`/${locale}/auth/signin`)
  }

  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const cookie = (await headers()).get('cookie') || ''
  const res = await fetch(`${baseUrl}/api/orders`, {
    cache: 'no-store',
    headers: { cookie },
  })
  if (!res.ok) {
    redirect(`/${locale}/auth/signin`)
  }
  const { orders } = (await res.json()) as { orders: DashboardOrder[] }

  return (
    <div className='space-y-8'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight'>{t('title')}</h2>
        <p className='text-muted-foreground'>{t('description')}</p>
      </div>
      <div className='space-y-4'>
        {orders.length === 0 ? (
          <p className='text-muted-foreground'>{t('no_orders')}</p>
        ) : (
          <OrdersFilterList orders={orders} />
        )}
      </div>
    </div>
  )
}
