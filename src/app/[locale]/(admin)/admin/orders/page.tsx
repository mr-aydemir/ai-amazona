'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Eye, Package, Loader2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrency } from '@/components/providers/currency-provider'
import Image from 'next/image'

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    images: string[]
  }
}

interface Order {
  id: string
  total: number
  status: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
  items: OrderItem[]
  shippingTrackingNumber?: string
  shippingTrackingUrl?: string
  shippingCarrier?: 'ARAS' | 'DHL' | 'YURTICI' | 'SURAT' | 'PTT' | 'HEPSIJET'
  shippingAddress: {
    id: string
    fullName: string
    address: string
    city: string
    postalCode: string
    country: string
  } | null
}

interface OrdersResponse {
  orders: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function AdminOrdersPage() {
  const t = useTranslations('admin.orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [updatingTracking, setUpdatingTracking] = useState<string | null>(null)
  const [trackingNumberInput, setTrackingNumberInput] = useState<string>('')
  const [trackingUrlInput, setTrackingUrlInput] = useState<string>('')
  const [carrierInput, setCarrierInput] = useState<'ARAS' | 'DHL' | 'YURTICI' | 'SURAT' | 'PTT' | 'HEPSIJET' | ''>('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })
  const [sortBy, setSortBy] = useState<'createdAt' | 'total' | 'status' | 'id'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const locale = useLocale()
  const { baseCurrency } = useCurrency()
  const nfLocale = (String(locale).startsWith('en') ? 'en-US' : 'tr-TR')
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(nfLocale, {
      style: 'currency',
      currency: baseCurrency
    }).format(amount)
  }
  const [translatedNames, setTranslatedNames] = useState<Record<string, string>>({})

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        sortBy,
        sortDir
      })

      const response = await fetch(`/api/admin/orders?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data: OrdersResponse = await response.json()
      setOrders(data.orders)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Siparişler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(orderId)
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          status: newStatus
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update order status')
      }

      const updatedOrder = await response.json()

      // Update the order in the list
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? updatedOrder : order
        )
      )

      // Update selected order if it's the same
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder)
      }

      toast.success('Sipariş durumu güncellendi')
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Sipariş durumu güncellenirken hata oluştu')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const updateShippingInfo = async (orderId: string) => {
    try {
      setUpdatingTracking(orderId)
      const payload: any = { orderId }
      const tn = (trackingNumberInput || '').trim()
      const tu = (trackingUrlInput || '').trim()
      const cr = carrierInput
      if (tn.length > 0) payload.trackingNumber = tn
      if (tu.length > 0) payload.trackingUrl = tu
      if (cr && cr.length > 0) payload.carrier = cr
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Failed to update tracking number')
      }

      const updatedOrder: Order = await response.json()

      // Update the order in the list
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? updatedOrder : order
        )
      )

      // Update selected order if it's the same
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder)
      }

      toast.success(t('toast.tracking_updated'))
    } catch (error) {
      console.error('Error updating tracking number:', error)
      toast.error(t('toast.tracking_update_error'))
    } finally {
      setUpdatingTracking(null)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'secondary'
      case 'PROCESSING':
        return 'default'
      case 'SHIPPED':
        return 'outline'
      case 'DELIVERED':
        return 'default'
      case 'CANCELLED':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getStatusText = (status: string) => t(`status.${status}`)

  useEffect(() => {
    fetchOrders()
  }, [pagination.page, statusFilter, searchTerm, sortBy, sortDir])

  // Load localized product names for selected order items
  useEffect(() => {
    if (!selectedOrder || !selectedOrder.items || selectedOrder.items.length === 0) return
    const uniqueIds = Array.from(new Set(selectedOrder.items.map(i => i.product.id)))
    let cancelled = false
    Promise.all(uniqueIds.map(async (id) => {
      try {
        const res = await fetch(`/api/products/${locale}/${id}`)
        if (!res.ok) return null
        const data = await res.json()
        return { id, name: (data?.name as string) || null }
      } catch {
        return null
      }
    })).then(results => {
      if (cancelled) return
      const map: Record<string, string> = {}
      for (const r of results) {
        if (r && r.name) {
          map[r.id] = r.name
        }
      }
      setTranslatedNames(map)
    })
    return () => { cancelled = true }
  }, [selectedOrder, locale])

  const handleSort = (field: 'createdAt' | 'total' | 'status' | 'id') => {
    setPagination(prev => ({ ...prev, page: 1 }))
    if (sortBy === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDir(field === 'createdAt' ? 'desc' : 'asc')
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  return (
    <div className='space-y-8'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight'>{t('title')}</h2>
        <p className='text-muted-foreground'>
          {t('description')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Package className='h-5 w-5' />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4' />
              <Input
                placeholder={t('search_placeholder')}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className='pl-10'
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className='w-full sm:w-[200px]'>
                <SelectValue placeholder={t('filter_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>{t('all_statuses')}</SelectItem>
                <SelectItem value='PENDING'>{t('status.PENDING')}</SelectItem>
                <SelectItem value='PROCESSING'>{t('status.PROCESSING')}</SelectItem>
                <SelectItem value='PAID'>{t('status.PAID')}</SelectItem>
                <SelectItem value='SHIPPED'>{t('status.SHIPPED')}</SelectItem>
                <SelectItem value='DELIVERED'>{t('status.DELIVERED')}</SelectItem>
                <SelectItem value='CANCELLED'>{t('status.CANCELLED')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-8 w-8 animate-spin' />
            </div>
          ) : (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        type='button'
                        className='flex items-center gap-1 hover:underline'
                        onClick={() => handleSort('id')}
                      >
                        {t('table.order_id')}
                        {sortBy === 'id' ? (
                          sortDir === 'asc' ? <ChevronUp className='h-3 w-3' /> : <ChevronDown className='h-3 w-3' />
                        ) : (
                          <ArrowUpDown className='h-3 w-3 text-muted-foreground' />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>{t('table.customer')}</TableHead>
                    <TableHead>
                      <button
                        type='button'
                        className='flex items-center gap-1 hover:underline'
                        onClick={() => handleSort('total')}
                      >
                        {t('table.total')}
                        {sortBy === 'total' ? (
                          sortDir === 'asc' ? <ChevronUp className='h-3 w-3' /> : <ChevronDown className='h-3 w-3' />
                        ) : (
                          <ArrowUpDown className='h-3 w-3 text-muted-foreground' />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type='button'
                        className='flex items-center gap-1 hover:underline'
                        onClick={() => handleSort('status')}
                      >
                        {t('table.status')}
                        {sortBy === 'status' ? (
                          sortDir === 'asc' ? <ChevronUp className='h-3 w-3' /> : <ChevronDown className='h-3 w-3' />
                        ) : (
                          <ArrowUpDown className='h-3 w-3 text-muted-foreground' />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type='button'
                        className='flex items-center gap-1 hover:underline'
                        onClick={() => handleSort('createdAt')}
                      >
                        {t('table.date')}
                        {sortBy === 'createdAt' ? (
                          sortDir === 'asc' ? <ChevronUp className='h-3 w-3' /> : <ChevronDown className='h-3 w-3' />
                        ) : (
                          <ArrowUpDown className='h-3 w-3 text-muted-foreground' />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center py-8'>
                        {t('messages.no_orders')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className='font-medium'>
                          #{order.id.slice(-8)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className='font-medium'>
                              {order.user.name || 'Anonim'}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                              {order.user.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className='font-medium'>
                          {formatAmount(order.total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {getStatusText(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleDateString(nfLocale)}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className='mr-2 h-4 w-4' />
                                {t('table.view_details')}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className='max-w-4xl max-h-[80vh] overflow-y-auto'>
                              <DialogHeader>
                                <DialogTitle>
                                  {t('details.title')} - #{order.id.slice(-8)}
                                </DialogTitle>
                                <DialogDescription>
                                  {t('details.description')}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedOrder && (
                                <div className='space-y-6'>
                                  {/* Order Info */}
                                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                    <div>
                                      <h4 className='font-semibold mb-2'>{t('details.order_info')}</h4>
                                      <div className='space-y-2 text-sm'>
                                        <p><span className='font-medium'>ID:</span> #{selectedOrder.id}</p>
                                        <p><span className='font-medium'>{t('table.total')}:</span> {formatAmount(selectedOrder.total)}</p>
                                        <p><span className='font-medium'>{t('table.date')}:</span> {new Date(selectedOrder.createdAt).toLocaleString(nfLocale)}</p>
                                        <div className='flex items-center gap-2'>
                                          <span className='font-medium'>{t('table.status')}:</span>
                                          <Select
                                            value={selectedOrder.status}
                                            onValueChange={(value) => updateOrderStatus(selectedOrder.id, value)}
                                            disabled={updatingStatus === selectedOrder.id}
                                          >
                                            <SelectTrigger className='w-[150px] h-8'>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value='PENDING'>{t('status.PENDING')}</SelectItem>
                                              <SelectItem value='PROCESSING'>{t('status.PROCESSING')}</SelectItem>
                                              <SelectItem value='PAID'>{t('status.PAID')}</SelectItem>
                                              <SelectItem value='SHIPPED'>{t('status.SHIPPED')}</SelectItem>
                                              <SelectItem value='DELIVERED'>{t('status.DELIVERED')}</SelectItem>
                                              <SelectItem value='CANCELLED'>{t('status.CANCELLED')}</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          {updatingStatus === selectedOrder.id && (
                                            <Loader2 className='h-4 w-4 animate-spin' />
                                          )}
                                        </div>
                                        <div className='flex flex-col gap-2 mt-3'>
                                          <div className='flex items-center gap-2'>
                                            <span className='font-medium'>{t('labels.tracking_number')}</span>
                                            <Input
                                              className='h-8 w-[280px]'
                                              placeholder={t('placeholders.tracking_number')}
                                              value={trackingNumberInput ?? selectedOrder.shippingTrackingNumber ?? ''}
                                              onChange={(e) => setTrackingNumberInput(e.target.value)}
                                            />
                                          </div>
                                          <div className='flex items-center gap-2'>
                                            <span className='font-medium'>{t('labels.tracking_url')}</span>
                                            <Input
                                              className='h-8 w-[360px]'
                                              placeholder={t('placeholders.tracking_url')}
                                              value={trackingUrlInput ?? selectedOrder.shippingTrackingUrl ?? ''}
                                              onChange={(e) => setTrackingUrlInput(e.target.value)}
                                            />
                                          </div>
                                          <div className='flex items-center gap-2'>
                                            <span className='font-medium'>{t('labels.carrier')}</span>
                                            <Select value={carrierInput || selectedOrder.shippingCarrier || ''} onValueChange={(v) => setCarrierInput(v as any)}>
                                              <SelectTrigger className='w-[200px] h-8'>
                                                <SelectValue placeholder={t('placeholders.carrier')} />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value='ARAS'>{t('carriers.ARAS')}</SelectItem>
                                                <SelectItem value='DHL'>{t('carriers.DHL')}</SelectItem>
                                                <SelectItem value='YURTICI'>{t('carriers.YURTICI')}</SelectItem>
                                                <SelectItem value='SURAT'>{t('carriers.SURAT')}</SelectItem>
                                                <SelectItem value='PTT'>{t('carriers.PTT')}</SelectItem>
                                                <SelectItem value='HEPSIJET'>{t('carriers.HEPSIJET')}</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className='flex items-center gap-2'>
                                            <Button
                                              variant='secondary'
                                              size='sm'
                                              onClick={() => updateShippingInfo(selectedOrder.id)}
                                              disabled={updatingTracking === selectedOrder.id}
                                            >
                                              {t('actions.save_shipping_info')}
                                            </Button>
                                            {updatingTracking === selectedOrder.id && (
                                              <Loader2 className='h-4 w-4 animate-spin' />
                                            )}
                                          </div>
                                        </div>
                                        {(selectedOrder.shippingTrackingUrl || selectedOrder.shippingTrackingNumber || selectedOrder.shippingCarrier) && (
                                          <div className='mt-2 text-sm text-muted-foreground'>
                                            {selectedOrder.shippingTrackingUrl ? (
                                              <p>
                                                <span className='font-medium'>{t('labels.saved_link')}:</span>{' '}
                                                <a href={selectedOrder.shippingTrackingUrl} target='_blank' rel='noopener noreferrer' className='underline'>
                                                  {t('actions.open_tracking')}
                                                </a>
                                              </p>
                                            ) : (
                                              <p>
                                                <span className='font-medium'>{t('labels.saved_number')}:</span> {selectedOrder.shippingTrackingNumber}
                                              </p>
                                            )}
                                            {selectedOrder.shippingCarrier && (
                                              <p>
                                                <span className='font-medium'>{t('labels.saved_carrier')}:</span> {t(`carriers.${selectedOrder.shippingCarrier}`)}
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className='font-semibold mb-2'>{t('details.customer_info')}</h4>
                                      <div className='space-y-2 text-sm'>
                                        <p><span className='font-medium'>{t('labels.name')}:</span> {selectedOrder.user.name || 'Anonim'}</p>
                                        <p><span className='font-medium'>{t('labels.email')}:</span> {selectedOrder.user.email}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Shipping Address */}
                                  {selectedOrder.shippingAddress && (
                                    <div>
                                      <h4 className='font-semibold mb-2'>{t('details.shipping_address')}</h4>
                                      <div className='text-sm bg-muted p-3 rounded-lg'>
                                        <p className='font-medium'>{selectedOrder.shippingAddress.fullName}</p>
                                        <p>{selectedOrder.shippingAddress.address}</p>
                                        <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.postalCode}</p>
                                        <p>{selectedOrder.shippingAddress.country}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Order Items */}
                                  <div>
                                    <h4 className='font-semibold mb-2'>{t('details.order_items')}</h4>
                                    <div className='space-y-3'>
                                      {selectedOrder.items.map((item) => (
                                        <div key={item.id} className='flex items-center gap-4 p-3 border rounded-lg'>
                                          <div className='relative w-16 h-16 bg-muted rounded-md overflow-hidden'>
                                            {item.product.images && item.product.images.length > 0 ? (
                                              <Image
                                                src={item.product.images[0]}
                                                alt={item.product.name}
                                                fill
                                                className='object-cover'
                                              />
                                            ) : (
                                              <div className='w-full h-full flex items-center justify-center'>
                                                <Package className='h-6 w-6 text-muted-foreground' />
                                              </div>
                                            )}
                                          </div>
                                          <div className='flex-1'>
                                            <p className='font-medium'>{translatedNames[item.product.id] ?? item.product.name}</p>
                                            <p className='text-sm text-muted-foreground'>
                                              {t('details.quantity')}: {item.quantity} × {formatAmount(item.price)}
                                            </p>
                                          </div>
                                          <div className='text-right'>
                                            <p className='font-medium'>
                                              {formatAmount(item.quantity * item.price)}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className='flex items-center justify-between mt-6'>
              <p className='text-sm text-muted-foreground'>
                {t('pagination.showing', {
                  start: ((pagination.page - 1) * pagination.limit) + 1,
                  end: Math.min(pagination.page * pagination.limit, pagination.total),
                  total: pagination.total
                })}
              </p>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  {t('pagination.previous')}
                </Button>
                <span className='text-sm'>
                  {t('pagination.page', { current: pagination.page, total: pagination.pages })}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                >
                  {t('pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}