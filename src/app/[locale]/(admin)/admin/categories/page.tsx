'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, Languages } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface CategoryTranslation {
  locale: string
  name: string
  description: string
}

interface Category {
  id: string
  name: string
  description: string
  translations: CategoryTranslation[]
  createdAt: string
  updatedAt: string
}

const SUPPORTED_LOCALES = [
  { code: 'tr', name: 'Türkçe' },
  { code: 'en', name: 'English' }
]

export default function CategoriesPage() {
  const t = useTranslations('admin.categories')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    translations: SUPPORTED_LOCALES.map(locale => ({
      locale: locale.code,
      name: '',
      description: ''
    }))
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      } else {
        toast({
          title: "Hata",
          description: "Kategoriler yüklenirken hata oluştu",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({
        title: "Ağ Hatası",
        description: "Sunucuya bağlanırken hata oluştu",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories'
      
      const method = editingCategory ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: editingCategory ? "Kategori güncellendi" : "Kategori eklendi",
        })
        setShowForm(false)
        setEditingCategory(null)
        resetForm()
        fetchCategories()
      } else {
        const errorData = await response.json()
        toast({
          title: "Hata",
          description: errorData.message || "İşlem sırasında hata oluştu",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving category:', error)
      toast({
        title: "Ağ Hatası",
        description: "Sunucuya bağlanırken hata oluştu",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description,
      translations: SUPPORTED_LOCALES.map(locale => {
        const translation = category.translations.find(t => t.locale === locale.code)
        return {
          locale: locale.code,
          name: translation?.name || category.name || '',
          description: translation?.description || category.description || ''
        }
      })
    })
    setShowForm(true)
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "Kategori silindi",
        })
        fetchCategories()
      } else {
        const errorData = await response.json()
        toast({
          title: "Hata",
          description: errorData.message || "Kategori silinirken hata oluştu",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: "Ağ Hatası",
        description: "Sunucuya bağlanırken hata oluştu",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      translations: SUPPORTED_LOCALES.map(locale => ({
        locale: locale.code,
        name: '',
        description: ''
      }))
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCategory(null)
    resetForm()
  }

  const updateTranslation = (locale: string, field: 'name' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: prev.translations.map(t => 
        t.locale === locale ? { ...t, [field]: value } : t
      )
    }))
  }

  if (loading) {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Kategori Yönetimi</h1>
          <p className="text-muted-foreground">Ürün kategorilerini yönetin</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="h-4 w-4 mr-2" />
          Kategori Ekle
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
                <TabsTrigger value="translations">
                  <Languages className="h-4 w-4 mr-2" />
                  Çeviriler
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label htmlFor="name">Kategori Adı</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Kategori adını girin"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Kategori açıklamasını girin"
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="translations" className="space-y-4">
                <Tabs defaultValue={SUPPORTED_LOCALES[0].code} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    {SUPPORTED_LOCALES.map(locale => (
                      <TabsTrigger key={locale.code} value={locale.code}>
                        {locale.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {SUPPORTED_LOCALES.map(locale => (
                    <TabsContent key={locale.code} value={locale.code} className="space-y-4">
                      <div>
                        <Label htmlFor={`name-${locale.code}`}>
                          Kategori Adı ({locale.name})
                        </Label>
                        <Input
                          id={`name-${locale.code}`}
                          value={formData.translations.find(t => t.locale === locale.code)?.name || ''}
                          onChange={(e) => updateTranslation(locale.code, 'name', e.target.value)}
                          placeholder={`Kategori adını ${locale.name} dilinde girin`}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`description-${locale.code}`}>
                          Açıklama ({locale.name})
                        </Label>
                        <Textarea
                          id={`description-${locale.code}`}
                          value={formData.translations.find(t => t.locale === locale.code)?.description || ''}
                          onChange={(e) => updateTranslation(locale.code, 'description', e.target.value)}
                          placeholder={`Kategori açıklamasını ${locale.name} dilinde girin`}
                          rows={3}
                        />
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Button type="submit">
                {editingCategory ? 'Güncelle' : 'Kaydet'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                İptal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Kategoriler</CardTitle>
          <CardDescription>
            Mevcut kategoriler ve çevirileri
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Henüz kategori yok</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{category.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {category.description}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {category.translations.map((translation) => (
                          <Badge key={translation.locale} variant="secondary">
                            {SUPPORTED_LOCALES.find(l => l.code === translation.locale)?.name}: {translation.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}