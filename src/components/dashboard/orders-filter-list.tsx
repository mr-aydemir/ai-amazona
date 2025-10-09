"use client"

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ReviewModal from '@/components/dashboard/review-modal'
import { useTranslations, useLocale } from 'next-intl'

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

export default function OrdersFilterList({
  orders,
}: {
  orders: DashboardOrder[]
}) {
  const t = useTranslations('dashboard.orders')
  const tStatus = useTranslations('admin.orders.status')
  const tAdmin = useTranslations('admin.orders')
  const locale = useLocale()

  const [status, setStatus] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((order) => {
      const statusOk = status === 'all' || order.status === status
      const created = new Date(order.createdAt).getTime()

      // Tarih aralığı filtresi
      const fromTime = from ? new Date(from).getTime() : null
      const toTime = to ? new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1 : null
      const dateOk = (!fromTime || created >= fromTime) && (!toTime || created <= toTime)

      if (!q) return statusOk && dateOk
      const idMatch = order.id.toLowerCase().includes(q)
      const itemMatch = order.items.some((item) =>
        item.product.name.toLowerCase().includes(q)
      )
      return statusOk && dateOk && (idMatch || itemMatch)
    })
  }, [orders, status, query])

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:gap-4'>
        <div className='w-full md:w-64'>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder={t('filter_status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('all_statuses')}</SelectItem>
              <SelectItem value='PENDING'>{tStatus('PENDING')}</SelectItem>
              <SelectItem value='PROCESSING'>{tStatus('PROCESSING')}</SelectItem>
              <SelectItem value='SHIPPED'>{tStatus('SHIPPED')}</SelectItem>
              <SelectItem value='DELIVERED'>{tStatus('DELIVERED')}</SelectItem>
              <SelectItem value='CANCELLED'>{tStatus('CANCELLED')}</SelectItem>
              <SelectItem value='PAID'>{tStatus('PAID')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='flex-1'>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tAdmin('search_placeholder')}
          />
        </div>
        <div className='grid grid-cols-2 gap-2 md:w-[320px]'>
          <div className='flex flex-col'>
            <span className='text-xs text-muted-foreground'>{t('from')}</span>
            <Input type='date' value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className='flex flex-col'>
            <span className='text-xs text-muted-foreground'>{t('to')}</span>
            <Input type='date' value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {query || status !== 'all' || from || to ? (
          <Button
            variant='outline'
            onClick={() => {
              setQuery('')
              setStatus('all')
              setFrom('')
              setTo('')
            }}
          >
            {t('clear_filters')}
          </Button>
        ) : null}
      </div>

      {filteredOrders.length === 0 ? (
        <p className='text-muted-foreground'>{t('no_orders')}</p>
      ) : (
        filteredOrders.map((order) => (
          <Card key={order.id}>
            <CardContent className='p-6'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='font-medium'>
                      {t('order_label')}
                      {order.id.slice(-8)}
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      order.status === 'DELIVERED'
                        ? 'default'
                        : order.status === 'CANCELLED'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className='capitalize'
                  >
                    {tStatus(order.status)}
                  </Badge>
                </div>
                <div className='divide-y'>
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className='flex items-center justify-between py-4'
                    >
                      <Link
                        href={`/${locale}/products/${item.product.id}`}
                        className='flex items-center space-x-4 group'
                      >
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className='h-16 w-16 rounded-md object-cover'
                        />
                        <div>
                          <p className='font-medium group-hover:underline'>
                            {item.product.name}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            {t('quantity')}: {item.quantity}
                          </p>
                        </div>
                      </Link>
                      <div className='flex items-center gap-3'>
                        <p className='font-medium'>
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                        {(order.status === 'PAID' || order.status === 'DELIVERED' || order.status === 'SHIPPED') && (
                          <ReviewModal
                            productId={item.product.id}
                            productName={item.product.name}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className='flex justify-between border-t pt-4'>
                  <div>
                    <p className='font-medium'>{t('shipping_address')}:</p>
                    <p className='text-sm text-muted-foreground'>
                      {order.shippingStreet}
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      {order.shippingCity}, {order.shippingState}{' '}
                      {order.shippingPostalCode}
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      {order.shippingCountry}
                    </p>
                    {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                      <div className='mt-4 space-y-2'>
                        {order.shippingTrackingUrl && (
                          <Button asChild variant='secondary' size='sm'>
                            <a
                              href={order.shippingTrackingUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                            >
                              Kargo Takibi
                            </a>
                          </Button>
                        )}
                        {(order.shippingCarrier || order.shippingTrackingNumber) && (
                          <div className='text-sm text-muted-foreground space-y-1'>
                            {order.shippingCarrier && (
                              <p>Kargo Firması: {order.shippingCarrier}</p>
                            )}
                            {order.shippingTrackingNumber && (
                              <p>Takip Kodu: {order.shippingTrackingNumber}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className='text-right'>
                    <p className='text-sm text-muted-foreground'>{t('total')}</p>
                    <p className='text-2xl font-bold'>
                      ${order.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}