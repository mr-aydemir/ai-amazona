'use client'

import { formatCurrency } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrderStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'

interface Order {
  id: string
  user: {
    name: string | null
  }
  total: number
  status: OrderStatus
  createdAt: Date
}

interface RecentOrdersProps {
  orders: Order[]
  currency?: string
}

const statusColors = {
  [OrderStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  [OrderStatus.PAID]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
  [OrderStatus.PROCESSING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  [OrderStatus.SHIPPED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  [OrderStatus.DELIVERED]: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
}

export function RecentOrders({ orders, currency = 'TRY' }: RecentOrdersProps) {
  const router = useRouter()
  const t = useTranslations('admin.dashboard.recent_orders')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('order_id')}</TableHead>
              <TableHead>{t('customer')}</TableHead>
              <TableHead>{t('total')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('date')}</TableHead>
              <TableHead className='text-right'>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className='font-medium'>{order.id}</TableCell>
                <TableCell>{order.user.name || t('anonymous')}</TableCell>
                <TableCell>{formatCurrency(order.total, currency)}</TableCell>
                <TableCell>
                  <Badge
                    variant='secondary'
                    className={statusColors[order.status]}
                  >
                    {t(`status_${order.status.toLowerCase()}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className='text-right'>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost' size='icon'>
                        <MoreHorizontal className='h-4 w-4' />
                        <span className='sr-only'>{t('actions')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                      >
                        <Eye className='mr-2 h-4 w-4' />
                        {t('view_details')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
