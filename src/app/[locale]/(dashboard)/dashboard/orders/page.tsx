import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function OrdersPage() {
  const session = await auth()
  const t = await getTranslations('dashboard.orders')
  const locale = await getLocale()

  if (!session?.user) {
    redirect(`/${locale}/sign-in`)
  }

  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const cookie = headers().get('cookie') || ''
  const res = await fetch(`${baseUrl}/api/orders`, {
    cache: 'no-store',
    headers: { cookie },
  })
  if (!res.ok) {
    redirect(`/${locale}/sign-in`)
  }
  const { orders } = await res.json()

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
          orders.map((order) => (
            <Card key={order.id}>
              <CardContent className='p-6'>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='font-medium'>{t('order_label')}{order.id.slice(-8)}</p>
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
                      {order.status.toLowerCase()}
                    </Badge>
                  </div>
                  <div className='divide-y'>
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className='flex items-center justify-between py-4'
                      >
                        <div className='flex items-center space-x-4'>
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className='h-16 w-16 rounded-md object-cover'
                          />
                          <div>
                            <p className='font-medium'>{item.product.name}</p>
                            <p className='text-sm text-muted-foreground'>
                              {t('quantity')}: {item.quantity}
                            </p>
                          </div>
                        </div>
                        <p className='font-medium'>
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
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
                        {order.shippingCity},{' '}
                        {order.shippingState}{' '}
                        {order.shippingPostalCode}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        {order.shippingCountry}
                      </p>
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
    </div>
  )
}
