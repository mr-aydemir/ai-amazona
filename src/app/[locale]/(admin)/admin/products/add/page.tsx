'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProductForm from '@/components/admin/product-form'
import { useToast } from '@/hooks/use-toast'

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

export default function AddProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const { toast } = useToast()

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true)
        const response = await fetch('/api/admin/categories')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        setCategories(data)
      } catch (error) {
        console.error('Error fetching categories:', error)
        toast({
          title: "Hata",
          description: "Kategoriler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.",
          variant: "destructive",
        })
      } finally {
        setCategoriesLoading(false)
      }
    }

    fetchCategories()
  }, [toast])

  const handleSubmit = async (data: ProductFormData) => {
    setLoading(true)
    try {
      console.log('Submitting product data:', data) // Debug log
      
      // Convert price and stock to numbers
      const submitData = {
        ...data,
        price: parseFloat(data.price),
        stock: parseInt(data.stock, 10)
      }
      
      console.log('Converted submit data:', submitData) // Debug log
      
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...submitData,
          slug: data.slug,
          translations: data.translations,
        }),
      })

      console.log('Response status:', response.status) // Debug log
      
      if (response.ok) {
        const result = await response.json()
        console.log('Success result:', result) // Debug log
        toast({
          title: "Başarılı",
          description: "Ürün başarıyla eklendi!",
        })
        router.push('/admin/products')
      } else {
        const errorData = await response.json()
        console.error('Error response:', errorData) // Debug log
        
        if (response.status === 400) {
          console.error('Validation error details:', errorData.error) // Debug log
          toast({
            title: "Geçersiz Veri",
            description: errorData.error || 'Form verilerinde hata var',
            variant: "destructive",
          })
        } else if (response.status === 401) {
          toast({
            title: "Yetki Hatası",
            description: "Bu işlem için yetkiniz bulunmuyor",
            variant: "destructive",
          })
        } else if (response.status === 403) {
          toast({
            title: "Erişim Engellendi",
            description: "Bu işlemi gerçekleştirme yetkiniz yok",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Hata",
            description: errorData.error || 'Ürün eklenirken hata oluştu',
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Submit error:', error) // Debug log
      toast({
        title: "Ağ Hatası",
        description: "Ürün eklenirken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/products')
  }

  const handleBack = () => {
    router.back()
  }

  // Show loading while categories are being fetched
  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Kategoriler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <ProductForm
      title="Yeni Ürün Ekle"
      submitButtonText="Ürünü Kaydet"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onBack={handleBack}
      loading={loading}
      categories={categories}
    />
  )
}