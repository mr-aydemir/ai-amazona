'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useTranslations } from 'next-intl'
import { useCurrency } from '@/components/providers/currency-provider'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Pagination } from '@/components/ui/pagination'
import { formatCurrency } from '@/lib/utils'

interface Product {
  id: string
  name: string
  price: number
  category: {
    id: string
    name: string
  }
  stock: number
  status: 'ACTIVE' | 'INACTIVE' | string
  createdAt: string
  images: string[]
}

export default function ProductsPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('admin.products')
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [locale, currentPage, limit, searchTerm])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        locale: String(locale),
        page: String(currentPage),
        limit: String(limit),
      })
      if (searchTerm) {
        params.set('search', searchTerm)
      }
      params.set('onlyPrimary', '1')
      const response = await fetch(`/api/admin/products?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      } else {
        console.error('Failed to fetch products')
        setProducts([])
        setTotal(0)
        setTotalPages(1)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const { baseCurrency } = useCurrency()
  const nfLocale = (String(locale).startsWith('en') ? 'en-US' : 'tr-TR')
  const formatPrice = (price: number) => {
    return formatCurrency(price, baseCurrency, nfLocale)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR')
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: t('stock_status.out_of_stock'), variant: 'destructive' as const }
    if (stock < 10) return { label: t('stock_status.low_stock'), variant: 'secondary' as const }
    return { label: t('stock_status.in_stock'), variant: 'default' as const }
  }

  const isActiveStatus = (status: Product['status']) => {
    return String(status).toUpperCase() === 'ACTIVE'
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      setDeletingProductId(productId)

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Ürünü listeden kaldır
        setProducts(prev => prev.filter(product => product.id !== productId))
        toast({
          title: 'Başarılı',
          description: 'Ürün başarıyla silindi',
        })
      } else {
        const errorData = await response.json()
        toast({
          title: 'Hata',
          description: errorData.error || 'Ürün silinirken bir hata oluştu',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      toast({
        title: 'Hata',
        description: 'Ürün silinirken bir hata oluştu',
        variant: 'destructive',
      })
    } finally {
      setDeletingProductId(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">{t('description')}</p>
          </div>
          <Button
            onClick={() => router.push(`/${locale}/admin/products/add`)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('add_product')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.total_products')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.active_products')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter(p => isActiveStatus(p.status)).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.out_of_stock')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter(p => p.stock === 0).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.low_stock')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.filter(p => p.stock > 0 && p.stock < 10).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t('search_products')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Products Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.product')}</TableHead>
                    <TableHead>{t('table.category')}</TableHead>
                    <TableHead>{t('table.price')}</TableHead>
                    <TableHead>{t('table.stock')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.created_at')}</TableHead>
                    <TableHead className="text-right">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <div className="text-muted-foreground">
                            {searchTerm ? t('no_search_results') : t('no_products')}
                          </div>
                          {!searchTerm && (
                            <Button variant="outline" className="mt-2">
                              <Plus className="h-4 w-4 mr-2" />
                              {t('add_product')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => {
                      const stockStatus = getStockStatus(product.stock)
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.images && product.images.length > 0 ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-10 h-10 rounded-md object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                                  <span className="text-muted-foreground text-xs">Resim</span>
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">ID: {product.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{product.category.name}</TableCell>
                          <TableCell className="font-medium">
                            {formatPrice(product.price)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{product.stock}</span>
                              <Badge variant={stockStatus.variant}>
                                {stockStatus.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isActiveStatus(product.status) ? 'default' : 'secondary'}>
                              {isActiveStatus(product.status) ? t('form.status_active') : t('form.status_inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(product.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/${locale}/admin/products/${product.id}/variants`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    disabled={deletingProductId === product.id}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('delete_product')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('confirm_delete')}
                                      <br />
                                      <strong>Ürün: {product.name}</strong>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('form.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {t('form.delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Gösterilen: {products.length} / Toplam: {total}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
