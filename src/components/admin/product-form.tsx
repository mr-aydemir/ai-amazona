'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, X, Upload, Languages } from 'lucide-react'
import { UploadDropzone } from '@/lib/uploadthing'

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

interface ProductFormProps {
  initialData?: ProductFormData
  onSubmit: (data: ProductFormData) => Promise<void>
  onCancel: () => void
  onBack: () => void
  title: string
  submitButtonText: string
  loading?: boolean
  categories?: Category[]
  productId?: string
}

const SUPPORTED_LOCALES = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
]

export default function ProductForm({
  initialData = {
    name: '',
    description: '',
    slug: '',
    price: '',
    stock: '',
    categoryId: '',
    status: 'ACTIVE',
    images: [],
    translations: SUPPORTED_LOCALES.map(locale => ({
      locale: locale.code,
      name: '',
      description: ''
    }))
  },
  onSubmit,
  onCancel,
  onBack,
  title,
  submitButtonText,
  loading = false,
  categories = [],
  productId
}: ProductFormProps) {
  const t = useTranslations('admin.products.form')
  const locale = useLocale()
  const [formData, setFormData] = useState<ProductFormData>(initialData)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basic')

  // EAV state
  const [attributesLoading, setAttributesLoading] = useState(false)
  const [inheritedAttributes, setInheritedAttributes] = useState<any[]>([])
  const [attributeValues, setAttributeValues] = useState<Record<string, { valueText?: string | null; valueNumber?: number | null; valueBoolean?: boolean | null; attributeOptionId?: string | null }>>({})
  const [savingAttributes, setSavingAttributes] = useState(false)

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      // Ensure translations exist for all supported locales
      const updatedTranslations = SUPPORTED_LOCALES.map(locale => {
        const existingTranslation = initialData.translations?.find(t => t.locale === locale.code)
        return {
          locale: locale.code,
          name: existingTranslation?.name ?? initialData.name ?? '',
          description: existingTranslation?.description ?? initialData.description ?? ''
        }
      })

      setFormData({
        ...initialData,
        translations: updatedTranslations
      })
    }
  }, [initialData?.name, initialData?.description, initialData?.slug, initialData?.price, initialData?.stock, initialData?.categoryId, JSON.stringify(initialData?.images), JSON.stringify(initialData?.translations)])

  // Fetch attributes for edit mode when productId is present
  useEffect(() => {
    const fetchAttributes = async () => {
      if (!productId || !formData.categoryId) {
        setInheritedAttributes([])
        setAttributeValues({})
        return
      }
      try {
        setAttributesLoading(true)
        const res = await fetch(`/api/admin/products/${productId}/attributes?locale=${locale}`)
        if (!res.ok) throw new Error('Atributlar yüklenemedi')
        const data = await res.json()
        setInheritedAttributes(data.attributes || [])
        const valuesMap: Record<string, any> = {}
        for (const v of (data.values || [])) {
          valuesMap[v.attributeId] = {
            valueText: v.valueText ?? null,
            valueNumber: v.valueNumber ?? null,
            valueBoolean: typeof v.valueBoolean === 'boolean' ? v.valueBoolean : null,
            attributeOptionId: v.attributeOptionId ?? null,
          }
        }
        setAttributeValues(valuesMap)
      } catch (err) {
        console.error(err)
      } finally {
        setAttributesLoading(false)
      }
    }
    fetchAttributes()
  }, [productId, formData.categoryId, locale])

  // Helpers for attributes
  const updateAttrValue = (attributeId: string, field: 'valueText' | 'valueNumber' | 'valueBoolean' | 'attributeOptionId', value: any) => {
    setAttributeValues(prev => ({
      ...prev,
      [attributeId]: {
        ...prev[attributeId],
        [field]: value,
      }
    }))
  }

  const saveAttributes = async () => {
    if (!productId) return
    try {
      setSavingAttributes(true)
      const payload = {
        values: Object.keys(attributeValues).map(attrId => ({
          attributeId: attrId,
          valueText: attributeValues[attrId]?.valueText ?? null,
          valueNumber: attributeValues[attrId]?.valueNumber ?? null,
          valueBoolean: typeof attributeValues[attrId]?.valueBoolean === 'boolean' ? attributeValues[attrId]?.valueBoolean : null,
          attributeOptionId: attributeValues[attrId]?.attributeOptionId ?? null,
        }))
      }
      const res = await fetch(`/api/admin/products/${productId}/attributes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Atributlar kaydedilemedi')
    } catch (err) {
      console.error(err)
    } finally {
      setSavingAttributes(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const addImageUrl = (url: string) => {
    if (url && !formData.images.includes(url)) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, url]
      }))
    }
  }

  const updateTranslation = (locale: string, field: 'name' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      translations: prev.translations.map(translation =>
        translation.locale === locale
          ? { ...translation, [field]: value }
          : translation
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('back')}
        </Button>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">{t('basic_info')}</TabsTrigger>
            <TabsTrigger value="translations">
              <Languages className="h-4 w-4 mr-2" />
              Çeviriler
            </TabsTrigger>
            <TabsTrigger value="images">{t('product_images')}</TabsTrigger>
            <TabsTrigger value="attributes">Özellikler</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('basic_info')}</CardTitle>
                <CardDescription>{t('basic_info_description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="slug">{t('slug')}</Label>
                  <Input
                    id="slug"
                    value={formData.slug || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder={t('slug_placeholder')}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Fiyat ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="stock">Stok Miktarı</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Kategori</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Durum</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'ACTIVE' | 'INACTIVE') => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Aktif</SelectItem>
                      <SelectItem value="INACTIVE">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="translations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ürün Çevirileri</CardTitle>
                <CardDescription>Ürün adı ve açıklamasını farklı dillerde girin</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tr" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    {SUPPORTED_LOCALES.map((locale) => (
                      <TabsTrigger key={locale.code} value={locale.code}>
                        <span className="mr-2">{locale.flag}</span>
                        {locale.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {SUPPORTED_LOCALES.map((locale) => {
                    const translation = formData.translations.find(t => t.locale === locale.code)
                    return (
                      <TabsContent key={locale.code} value={locale.code} className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor={`name-${locale.code}`}>
                            Ürün Adı ({locale.name})
                          </Label>
                          <Input
                            id={`name-${locale.code}`}
                            value={translation?.name || ''}
                            onChange={(e) => updateTranslation(locale.code, 'name', e.target.value)}
                            placeholder={`Ürün adını ${locale.name} dilinde girin`}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor={`description-${locale.code}`}>
                            Açıklama ({locale.name})
                          </Label>
                          <Textarea
                            id={`description-${locale.code}`}
                            value={translation?.description || ''}
                            onChange={(e) => updateTranslation(locale.code, 'description', e.target.value)}
                            placeholder={`Ürün açıklamasını ${locale.name} dilinde girin`}
                            rows={4}
                            required
                          />
                        </div>
                      </TabsContent>
                    )
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('product_images')}</CardTitle>
                <CardDescription>{t('product_images_description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* UploadThing Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <UploadDropzone
                    endpoint="imageUploader"
                    onClientUploadComplete={(res) => {
                      console.log('🎉 Upload complete callback triggered!') // Debug log
                      console.log('📁 Upload response:', res) // Debug log
                      console.log('📁 Response type:', typeof res) // Debug log
                      console.log('📁 Response length:', res?.length) // Debug log

                      if (res && res.length > 0) {
                        const newUrls = res.map(file => {
                          console.log('📎 Processing file:', file) // Debug log
                          return file.url
                        })
                        console.log('🔗 New URLs extracted:', newUrls) // Debug log

                        // Use functional update to ensure we get the latest state
                        setFormData(prev => {
                          console.log('📋 Previous form data:', prev) // Debug log
                          const updatedImages = [...prev.images, ...newUrls]
                          const updated = {
                            ...prev,
                            images: updatedImages
                          }
                          console.log('🖼️ Previous images:', prev.images) // Debug log
                          console.log('🖼️ Updated images:', updatedImages) // Debug log
                          console.log('📋 Updated form data:', updated) // Debug log
                          return updated
                        })

                        // Show success message
                        console.log(`✅ Successfully uploaded ${newUrls.length} image(s)`)
                      } else {
                        console.log('❌ No files uploaded or res is empty')
                        console.log('❌ Response details:', { res, length: res?.length })
                      }
                    }}
                    onUploadError={(error: Error) => {
                      console.error('❌ Upload error occurred:', error)
                      console.error('❌ Error message:', error.message)
                      console.error('❌ Error stack:', error.stack)
                    }}
                    onUploadBegin={(name) => {
                      console.log('🚀 Upload started for file:', name)
                    }}
                    onDrop={(acceptedFiles) => {
                      console.log('📂 Files dropped:', acceptedFiles)
                      console.log('📂 Number of files:', acceptedFiles.length)
                      acceptedFiles.forEach((file, index) => {
                        console.log(`📄 File ${index + 1}:`, {
                          name: file.name,
                          size: file.size,
                          type: file.type
                        })
                      })
                    }}
                    config={{
                      mode: "auto"
                    }}
                  />
                </div>

                {/* Image Preview Grid */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Product image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-75 transition-opacity"
                          onClick={() => setSelectedImage(image)}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual URL Input */}
                <div className="space-y-2">
                  <Label>Add Image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/image.jpg"
                      onKeyUp={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const input = e.target as HTMLInputElement
                          const url = input.value.trim()
                          if (url) {
                            addImageUrl(url)
                            input.value = ''
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        const input = (e.target as HTMLButtonElement).previousElementSibling as HTMLInputElement
                        const url = input.value.trim()
                        if (url) {
                          addImageUrl(url)
                          input.value = ''
                        }
                      }}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="attributes" className="space-y-6">
            <div className="rounded border p-4">
              {!productId ? (
                <p className="text-sm text-muted-foreground">Ürün oluşturulduktan sonra özellikler düzenlenebilir.</p>
              ) : attributesLoading ? (
                <p>Yükleniyor...</p>
              ) : inheritedAttributes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bu kategoride tanımlı özellik yok.</p>
              ) : (
                <div className="space-y-4">
                  {inheritedAttributes.map((attr) => (
                    <div key={attr.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div>
                        <div className="font-medium">{attr.translations?.[0]?.name || attr.key}</div>
                        <div className="text-xs text-muted-foreground">{attr.type}{attr.unit ? ` (${attr.unit})` : ''}</div>
                      </div>
                      <div className="md:col-span-2">
                        {attr.type === 'TEXT' && (
                          <Input
                            value={attributeValues[attr.id]?.valueText ?? ''}
                            onChange={(e) => updateAttrValue(attr.id, 'valueText', e.target.value)}
                            placeholder="Metin değeri"
                          />
                        )}
                        {attr.type === 'NUMBER' && (
                          <Input
                            type="number"
                            value={attributeValues[attr.id]?.valueNumber ?? ''}
                            onChange={(e) => updateAttrValue(attr.id, 'valueNumber', e.target.value ? Number(e.target.value) : null)}
                            placeholder="Sayısal değer"
                          />
                        )}
                        {attr.type === 'BOOLEAN' && (
                          <Select
                            value={typeof attributeValues[attr.id]?.valueBoolean === 'boolean' ? String(attributeValues[attr.id]?.valueBoolean) : ''}
                            onValueChange={(v) => updateAttrValue(attr.id, 'valueBoolean', v === 'true' ? true : v === 'false' ? false : null)}
                          >
                            <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Evet</SelectItem>
                              <SelectItem value="false">Hayır</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {attr.type === 'SELECT' && (
                          <Select
                            value={attributeValues[attr.id]?.attributeOptionId ?? ''}
                            onValueChange={(v) => updateAttrValue(attr.id, 'attributeOptionId', v || null)}
                          >
                            <SelectTrigger><SelectValue placeholder="Seçenek seçin" /></SelectTrigger>
                            <SelectContent>
                              {(attr.options || []).map((opt: any) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.translations?.[0]?.name || opt.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <Button type="button" onClick={saveAttributes} disabled={savingAttributes || !productId}>
                      {savingAttributes ? 'Kaydediliyor...' : 'Özellikleri Kaydet'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Kaydediliyor...' : submitButtonText}
          </Button>
        </div>
      </form>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-white/80 z-10 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={selectedImage}
              alt={t('product_image_preview')}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}