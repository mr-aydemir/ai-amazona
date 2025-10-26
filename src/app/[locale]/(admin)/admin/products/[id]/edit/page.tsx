'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import ProductForm from '@/components/admin/product-form'
import { useToast } from '@/hooks/use-toast'

interface Product {
  id: string
  name: string
  description: string
  slug?: string
  price: number
  stock: number
  categoryId: string
  status: 'ACTIVE' | 'INACTIVE'
  category: {
    id: string
    name: string
  }
  images: string[]
  translations: {
    locale: string
    name: string
    description: string
  }[]
}

interface Category {
  id: string
  name: string
}

interface ProductTranslation {
  locale: string
  name: string
  description: string
}

interface ProductFormData {
  name: string
  description: string
  slug?: string
  price: string
  stock: string
  categoryId: string
  status: 'ACTIVE' | 'INACTIVE'
  images: string[]
  translations: ProductTranslation[]
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditProductPage(props: PageProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [initialData, setInitialData] = useState<ProductFormData | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      try {
        const { id } = await props.params

        // Load categories and product in parallel
        const [categoriesResponse, productResponse] = await Promise.all([
          fetch('/api/admin/categories'),
          fetch(`/api/admin/products/${id}`)
        ])

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData)
        }

        if (productResponse.ok) {
          const productData = await productResponse.json()
          setProduct(productData)

          // Parse images if it's a JSON string
          let parsedImages = []
          if (typeof productData.images === 'string') {
            try {
              parsedImages = JSON.parse(productData.images)
            } catch {
              parsedImages = []
            }
          } else if (Array.isArray(productData.images)) {
            parsedImages = productData.images
          }

          const formData: ProductFormData = {
            name: productData.name,
            description: productData.description,
            slug: productData.slug || '',
            price: productData.price.toString(),
            stock: productData.stock.toString(),
            categoryId: productData.categoryId,
            status: productData.status || 'ACTIVE',
            images: parsedImages || [],
            translations: productData.translations || []
          }
          setInitialData(formData)
        } else {
          toast({
            title: "Hata",
            description: "Ürün yüklenirken hata oluştu",
            variant: "destructive",
          })
          console.error('Ürün yüklenirken hata oluştu')
          router.push('/admin/products')
        }
      } catch (error) {
        toast({
          title: "Ağ Hatası",
          description: "Sunucuya bağlanırken hata oluştu",
          variant: "destructive",
        })
        console.error('Veri yüklenirken hata oluştu:', error)
        router.push('/admin/products')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [props.params, router, toast])

  const handleSubmit = async (data: ProductFormData) => {
    if (!product) return

    setSubmitting(true)
    try {
      const { id } = await props.params
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          slug: data.slug,
          price: parseFloat(data.price),
          stock: parseInt(data.stock),
          categoryId: data.categoryId,
          status: data.status,
          images: data.images,
          translations: data.translations,
        }),
      })

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "Ürün başarıyla güncellendi",
        })
        router.push('/admin/products')
      } else {
        const errorData = await response.json()
        if (response.status === 400) {
          toast({
            title: "Doğrulama Hatası",
            description: errorData.message || "Girilen veriler geçersiz",
            variant: "destructive",
          })
        } else if (response.status === 404) {
          toast({
            title: "Hata",
            description: "Ürün bulunamadı",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Hata",
            description: "Ürün güncellenirken hata oluştu",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Ağ Hatası",
        description: "Sunucuya bağlanırken hata oluştu",
        variant: "destructive",
      })
      console.error('Ürün güncellenirken hata oluştu:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // const handleCancel = () => {
  //   router.push('/admin/products')
  // }

  const handleBack = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Ürün Bulunamadı</h1>
        <Button onClick={handleBack}>Geri Dön</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Ürün Düzenle</h1>
          <Button variant="outline" onClick={handleBack}>
            Geri Dön
          </Button>
        </div>

        {initialData && (
          <ProductForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/admin/products')}
            onBack={() => router.push('/admin/products')}
            title="Edit Product"
            submitButtonText="Update Product"
            loading={submitting}
            categories={categories}
            productId={product?.id}
          />
        )}
      </div>
    </div>
  )
}