import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import prisma from '@/lib/prisma'
import { OrderStatus, Role } from '@prisma/client'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, CreditCard } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { Session } from 'next-auth'
import { getCurrencyData } from '@/lib/server-currency'

async function getMetrics(session: Session | null) {
  try {
    if (!session || session.user.role !== Role.ADMIN) {
      throw new Error('Unauthorized')
    }

    // Get current date and date for last month
    const now = new Date()
    const lastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    )
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000)

    // Valid statuses for revenue/orders (paid or shipped/delivered)
    const validStatuses = [
      OrderStatus.PAID, 
      OrderStatus.PROCESSING, 
      OrderStatus.SHIPPED, 
      OrderStatus.DELIVERED
    ];

    // Get total revenue and compare with last month
    const [totalRevenue, lastMonthRevenue] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: validStatuses } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          status: { in: validStatuses },
          createdAt: { lt: now, gte: lastMonth },
        },
        _sum: { total: true },
      }),
    ])

    // Get total orders and compare with last hour
    const [totalOrders, lastHourOrders] = await Promise.all([
      prisma.order.count({
        where: { status: { in: validStatuses } }
      }),
      prisma.order.count({
        where: {
          status: { in: validStatuses },
          createdAt: { lt: now, gte: lastHour },
        },
      }),
    ])

    // Get total customers and compare with last month
    const [totalCustomers, lastMonthCustomers] = await Promise.all([
      prisma.user.count({ where: { role: Role.USER } }),
      prisma.user.count({
        where: {
          role: Role.USER,
          createdAt: { lt: now, gte: lastMonth },
        },
      }),
    ])

    // Calculate average order value and compare with last week
    const [currentAOV, lastWeekAOV] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: validStatuses } },
        _avg: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          status: { in: validStatuses },
          createdAt: { lt: now, gte: lastWeek },
        },
        _avg: { total: true },
      }),
    ])

    const totalRevenueCurrent = totalRevenue._sum.total || 0
    const lastMonthRevenueCurrent = lastMonthRevenue._sum.total || 0
    const currentAOVValue = currentAOV._avg.total || 0
    const lastWeekAOVValue = lastWeekAOV._avg.total || 0

    // Calculate percentage changes
    const revenueChange = lastMonthRevenueCurrent
      ? ((totalRevenueCurrent - lastMonthRevenueCurrent) /
        lastMonthRevenueCurrent) *
      100
      : 0

    const customerChange = lastMonthCustomers
      ? ((totalCustomers - lastMonthCustomers) / lastMonthCustomers) * 100
      : 0

    const aovChange = lastWeekAOVValue
      ? ((currentAOVValue - lastWeekAOVValue) / lastWeekAOVValue) * 100
      : 0

    return {
      totalRevenue: totalRevenueCurrent,
      revenueChange,
      totalOrders,
      newOrders: lastHourOrders,
      totalCustomers,
      customerChange,
      averageOrderValue: currentAOVValue,
      aovChange,
    }
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return null
  }
}

export async function MetricsCards({ session }: { session: Session | null }) {
  const metrics = await getMetrics(session)
  const { baseCurrency } = await getCurrencyData()

  if (!metrics) {
    const t = await getTranslations('admin.dashboard.metrics')
    return (<div>{t('failed_to_load')}</div>)
  }

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      <Suspense fallback={<MetricCardSkeleton />}>
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue, baseCurrency)}
          change={metrics.revenueChange}
          changeText="from last month"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
      </Suspense>

      <Suspense fallback={<MetricCardSkeleton />}>
        <MetricCard
          title="Total Orders"
          value={`+${metrics.totalOrders}`}
          change={null}
          changeText={`+${metrics.newOrders} since last hour`}
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
        />
      </Suspense>

      <Suspense fallback={<MetricCardSkeleton />}>
        <MetricCard
          title="Total Customers"
          value={metrics.totalCustomers.toString()}
          change={metrics.customerChange}
          changeText="from last week"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </Suspense>

      <Suspense fallback={<MetricCardSkeleton />}>
        <MetricCard
          title="Average Order Value"
          value={formatCurrency(metrics.averageOrderValue, baseCurrency)}
          change={metrics.aovChange}
          changeText="from last week"
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
        />
      </Suspense>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  change: number | null
  changeText: string
  icon: React.ReactNode
}

function MetricCard({ title, value, change, changeText, icon }: MetricCardProps) {
  const t = useTranslations('admin.dashboard.metrics')

  const getTitle = (title: string) => {
    switch (title) {
      case 'Total Revenue':
        return t('total_revenue')
      case 'Total Orders':
        return t('total_orders')
      case 'Total Customers':
        return t('total_customers')
      case 'Average Order Value':
        return t('average_order_value')
      default:
        return title
    }
  }

  const getChangeText = (changeText: string) => {
    if (changeText.includes('from last month')) {
      return t('from_last_month')
    } else if (changeText.includes('since last hour')) {
      return t('since_last_hour')
    } else if (changeText.includes('from last week')) {
      return t('from_last_week')
    }
    return changeText
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{getTitle(title)}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        <p className='text-xs text-muted-foreground flex items-center'>
          {change !== null && (
            <>
              {change > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}% {getChangeText(changeText)}
            </>
          )}
          {change === null && getChangeText(changeText)}
        </p>
      </CardContent>
    </Card>
  )
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <Skeleton className='h-4 w-24' />
      </CardHeader>
      <CardContent>
        <Skeleton className='h-8 w-36 mb-2' />
        <Skeleton className='h-4 w-24' />
      </CardContent>
    </Card>
  )
}
