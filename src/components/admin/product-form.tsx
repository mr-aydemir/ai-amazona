'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, X, Upload } from 'lucide-react'
import { UploadDropzone } from '@/lib/uploadthing'

interface Category {
  id: string
  name: string
}

interface ProductFormData {
  name: string
  description: string
  price: string
  stock: string
  categoryId: string
  status: 'ACTIVE' | 'INACTIVE'
  images: string[]
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
}

export default function ProductForm({
  initialData = {
    name: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
    status: 'ACTIVE',
    images: []
  },
  onSubmit,
  onCancel,
  onBack,
  title,
  submitButtonText,
  loading = false,
  categories = []
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialData)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData?.name, initialData?.description, initialData?.price, initialData?.stock, initialData?.categoryId, JSON.stringify(initialData?.images)])

  // Helper functions
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
          Back
        </Button>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the basic product details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter product description"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price ($)</Label>
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
                <Label htmlFor="stock">Stock Quantity</Label>
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
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
            <CardDescription>Upload product images or add image URLs</CardDescription>
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

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : submitButtonText}
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
              alt="Product image preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}