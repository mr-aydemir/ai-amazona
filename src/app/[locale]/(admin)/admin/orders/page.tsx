'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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
import { Search, Eye, Package, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Beklemede'
      case 'PROCESSING':
        return 'İşleniyor'
      case 'SHIPPED':
        return 'Kargoya Verildi'
      case 'DELIVERED':
        return 'Teslim Edildi'
      case 'CANCELLED':
        return 'İptal Edildi'
      default:
        return status
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [pagination.page, statusFilter, searchTerm])

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
          Tüm siparişleri görüntüleyin ve yönetin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Package className='h-5 w-5' />
            Siparişler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4' />
              <Input
                placeholder='Sipariş ID, müşteri adı veya e-posta ile ara...'
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className='pl-10'
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className='w-full sm:w-[200px]'>
                <SelectValue placeholder='Durum filtrele' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tüm Durumlar</SelectItem>
                <SelectItem value='PENDING'>Beklemede</SelectItem>
                <SelectItem value='PROCESSING'>İşleniyor</SelectItem>
                <SelectItem value='SHIPPED'>Kargoya Verildi</SelectItem>
                <SelectItem value='DELIVERED'>Teslim Edildi</SelectItem>
                <SelectItem value='CANCELLED'>İptal Edildi</SelectItem>
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
                    <TableHead>Sipariş ID</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Toplam</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center py-8'>
                        Sipariş bulunamadı
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
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {getStatusText(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleDateString('tr-TR')}
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
                                Detaylar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className='max-w-4xl max-h-[80vh] overflow-y-auto'>
                              <DialogHeader>
                                <DialogTitle>
                                  Sipariş Detayları - #{order.id.slice(-8)}
                                </DialogTitle>
                                <DialogDescription>
                                  Sipariş bilgileri ve ürün detayları
                                </DialogDescription>
                              </DialogHeader>
                              {selectedOrder && (
                                <div className='space-y-6'>
                                  {/* Order Info */}
                                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                    <div>
                                      <h4 className='font-semibold mb-2'>Sipariş Bilgileri</h4>
                                      <div className='space-y-2 text-sm'>
                                        <p><span className='font-medium'>ID:</span> #{selectedOrder.id}</p>
                                        <p><span className='font-medium'>Toplam:</span> {formatCurrency(selectedOrder.total)}</p>
                                        <p><span className='font-medium'>Tarih:</span> {new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}</p>
                                        <div className='flex items-center gap-2'>
                                          <span className='font-medium'>Durum:</span>
                                          <Select
                                            value={selectedOrder.status}
                                            onValueChange={(value) => updateOrderStatus(selectedOrder.id, value)}
                                            disabled={updatingStatus === selectedOrder.id}
                                          >
                                            <SelectTrigger className='w-[150px] h-8'>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value='PENDING'>Beklemede</SelectItem>
                                              <SelectItem value='PROCESSING'>İşleniyor</SelectItem>
                                              <SelectItem value='SHIPPED'>Kargoya Verildi</SelectItem>
                                              <SelectItem value='DELIVERED'>Teslim Edildi</SelectItem>
                                              <SelectItem value='CANCELLED'>İptal Edildi</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          {updatingStatus === selectedOrder.id && (
                                            <Loader2 className='h-4 w-4 animate-spin' />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className='font-semibold mb-2'>Müşteri Bilgileri</h4>
                                      <div className='space-y-2 text-sm'>
                                        <p><span className='font-medium'>Ad:</span> {selectedOrder.user.name || 'Anonim'}</p>
                                        <p><span className='font-medium'>E-posta:</span> {selectedOrder.user.email}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Shipping Address */}
                                  {selectedOrder.shippingAddress && (
                                    <div>
                                      <h4 className='font-semibold mb-2'>Teslimat Adresi</h4>
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
                                    <h4 className='font-semibold mb-2'>Sipariş Kalemleri</h4>
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
                                            <p className='font-medium'>{item.product.name}</p>
                                            <p className='text-sm text-muted-foreground'>
                                              Adet: {item.quantity} × {formatCurrency(item.price)}
                                            </p>
                                          </div>
                                          <div className='text-right'>
                                            <p className='font-medium'>
                                              {formatCurrency(item.quantity * item.price)}
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
                Toplam {pagination.total} siparişten {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} arası gösteriliyor
              </p>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Önceki
                </Button>
                <span className='text-sm'>
                  Sayfa {pagination.page} / {pagination.pages}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}