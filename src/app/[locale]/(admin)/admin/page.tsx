import { MetricsCards } from '@/components/admin/metrics-cards'
import { RevenueChart } from '@/components/admin/revenue-chart'
import { OrderStats } from '@/components/admin/order-stats'
import { RecentOrders } from '@/components/admin/recent-orders'
import { getRevenueData, getOrderStats, getRecentOrders } from '@/lib/analytics'
import { auth } from '@/auth'

export default async function AdminDashboardPage() {
  const session = await auth()

  const [revenueData, orderStats, recentOrders] = await Promise.all([
    getRevenueData(),
    getOrderStats(),
    getRecentOrders(5),
  ])

  return (
    <div className='space-y-8'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight'>Dashboard</h2>
        <p className='text-muted-foreground'>Welcome to your admin dashboard</p>
      </div>

      {/* Key Metrics */}
      <MetricsCards session={session} />

      {/* Charts Grid */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
        <RevenueChart data={revenueData} />
        <OrderStats data={orderStats} />
      </div>

      {/* Recent Orders */}
      <RecentOrders orders={recentOrders} />
    </div>
  )
}
