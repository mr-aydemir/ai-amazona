'use client'

import { useState, useEffect } from 'react'
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
import { Search, Eye, Mail, CheckCircle, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'

interface Customer {
  id: string
  name: string | null
  email: string
  emailVerified: Date | null
  image: string | null
  createdAt: string
  _count: {
    orders: number
  }
  orders: {
    total: number
  }[]
}

export default function CustomersPage() {
  const t = useTranslations('admin.customers')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/customers')
      if (!response.ok) {
        throw new Error('Failed to fetch customers')
      }
      const data = await response.json()
      setCustomers(data)
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Müşteriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTotalSpent = (customer: Customer) => {
    return customer.orders.reduce((total, order) => total + order.total, 0)
  }

  const formatCurrencyDisplay = (amount: number) => {
    return formatCurrency(amount, 'TRY', 'tr-TR')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR')
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
        <p className="text-muted-foreground">
          Müşterilerinizi görüntüleyin ve yönetin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Listesi</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Müşteri ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('customer_name')}</TableHead>
                    <TableHead>{t('email')}</TableHead>
                    <TableHead>{t('email_verified')}</TableHead>
                    <TableHead>{t('registration_date')}</TableHead>
                    <TableHead>{t('total_orders')}</TableHead>
                    <TableHead>{t('total_spent')}</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {searchTerm ? 'Arama kriterlerine uygun müşteri bulunamadı' : 'Henüz müşteri yok'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {customer.name || 'İsimsiz Müşteri'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.emailVerified ? (
                            <div className="flex items-center space-x-2 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Doğrulandı</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-red-600">
                              <XCircle className="h-4 w-4" />
                              <span className="text-sm">Doğrulanmadı</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(customer.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {customer._count.orders}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(getTotalSpent(customer))}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCustomer(customer)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t('view_customer')}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{t('customer_details')}</DialogTitle>
                                <DialogDescription>
                                  {selectedCustomer?.name || 'İsimsiz Müşteri'} müşterisinin detay bilgileri
                                </DialogDescription>
                              </DialogHeader>
                              {selectedCustomer && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">İsim</label>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedCustomer.name || 'Belirtilmemiş'}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">E-posta</label>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedCustomer.email}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">E-posta Doğrulama</label>
                                      <div className="flex items-center space-x-2 mt-1">
                                        {selectedCustomer.emailVerified ? (
                                          <>
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <span className="text-sm text-green-600">Doğrulandı</span>
                                          </>
                                        ) : (
                                          <>
                                            <XCircle className="h-4 w-4 text-red-600" />
                                            <span className="text-sm text-red-600">Doğrulanmadı</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Kayıt Tarihi</label>
                                      <p className="text-sm text-muted-foreground">
                                        {formatDate(selectedCustomer.createdAt)}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Toplam Sipariş</label>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedCustomer._count.orders} sipariş
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Toplam Harcama</label>
                                      <p className="text-sm text-muted-foreground font-medium">
                                        {formatCurrency(getTotalSpent(selectedCustomer))}
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-medium mb-2">{t('order_history')}</h4>
                                    {selectedCustomer.orders.length > 0 ? (
                                      <div className="space-y-2">
                                        {selectedCustomer.orders.map((order, index) => (
                                          <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                                            <span className="text-sm">Sipariş #{index + 1}</span>
                                            <span className="text-sm font-medium">
                                              {formatCurrency(order.total)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        Henüz sipariş verilmemiş
                                      </p>
                                    )}
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
        </CardContent>
      </Card>
    </div>
  )
}