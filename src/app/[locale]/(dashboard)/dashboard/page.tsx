import { auth } from '@/auth'
import { redirect } from 'next/navigation'
// Data will be fetched from API instead of direct Prisma
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PackageSearch, MapPin, Heart } from 'lucide-react'
import { getLocale } from 'next-intl/server'

export default async function DashboardPage() {
  const session = await auth()
  const locale = await getLocale()

  if (!session?.user) {
    redirect(`/${locale}/sign-in`)
  }

  const res = await fetch('/api/dashboard', { cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 401) {
      redirect(`/${locale}/sign-in`)
    }
    throw new Error('Failed to load dashboard data')
  }
  const { ordersCount, addressesCount, user, recentOrders } = await res.json()

  return (
    <div className='space-y-8'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight'>
          Welcome back, {user?.name}
        </h2>
        <p className='text-muted-foreground'>
          Here&apos;s a summary of your account
        </p>
      </div>
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Orders</CardTitle>
            <PackageSearch className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{ordersCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Saved Addresses
            </CardTitle>
            <MapPin className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{addressesCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Wishlist Items
            </CardTitle>
            <Heart className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>0</div>
          </CardContent>
        </Card>
      </div>
      <div className='space-y-4'>
        <h3 className='text-xl font-semibold'>Recent Orders</h3>
        {(!recentOrders || recentOrders.length === 0) ? (
          <p className='text-muted-foreground'>No orders yet</p>
        ) : (
          <div className='grid gap-4'>
            {recentOrders.map((order: any) => (
              <Card key={order.id}>
                <CardContent className='p-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='font-medium'>Order #{order.id.slice(-8)}</p>
                      <p className='text-sm text-muted-foreground'>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='font-medium'>${order.total.toFixed(2)}</p>
                      <p className='text-sm capitalize text-muted-foreground'>
                        {order.status.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
