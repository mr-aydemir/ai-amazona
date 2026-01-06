'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, Languages, Loader2, Check, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { slugify } from '@/lib/slugify'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CategoryTranslation {
  locale: string
  name: string
  description: string
}

interface Category {
  id: string
  name: string
  description: string
  slug?: string
  parentId?: string | null
  parent?: Category | null
  children?: Category[]
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
  const tCommon = useTranslations('common')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  // Delete Dialog State
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Slug validation moved to translations per-locale
  const [slugValidationByLocale, setSlugValidationByLocale] = useState<Record<string, {
    isChecking: boolean
    isValid: boolean | null
    message: string
  }>>({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    parentId: null as string | null,
    translations: SUPPORTED_LOCALES.map(locale => ({
      locale: locale.code,
      name: '',
      description: ''
    }))
  })
  const { toast } = useToast()
  const router = useRouter()
  const localeParam = useLocale() as string
  
  // Attribute management state
  const [attrOpen, setAttrOpen] = useState(false)
  const [attrLoading, setAttrLoading] = useState(false)
  const [attrCategory, setAttrCategory] = useState<Category | null>(null)
  const [attributes, setAttributes] = useState<any[]>([])
  const [attrForm, setAttrForm] = useState({
    key: '',
    type: 'TEXT' as 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT',
    unit: '',
    isRequired: false,
    sortOrder: 0,
    translations: SUPPORTED_LOCALES.map(l => ({ locale: l.code, name: '' })),
    options: [] as Array<{ tr: string; en: string; key?: string }>
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      } else {
        toast({
          title: tCommon('status.error'),
          description: t('messages.error'),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({
        title: tCommon('status.error'),
        description: t('messages.network_error'),
        variant: 'destructive',
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

      // Filter empty translations and ensure basic name
      const validTranslations = formData.translations.filter(t => t.name && t.name.trim().length > 0)
      
      const payload = {
        ...formData,
        name: formData.name || (validTranslations.length > 0 ? validTranslations[0].name : ''),
        translations: validTranslations
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: tCommon('status.success'),
          description: editingCategory ? t('category_updated') : t('category_created'),
        })
        setShowForm(false)
        setEditingCategory(null)
        resetForm()
        fetchCategories()
      } else {
        const errorData = await response.json()
        toast({
          title: tCommon('status.error'),
          description: errorData.message || (editingCategory ? t('messages.update_error') : t('messages.create_error')),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving category:', error)
      toast({
        title: tCommon('status.error'),
        description: t('messages.network_error'),
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description,
      slug: category.slug || '',
      parentId: category.parentId ?? null,
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

  const handleDeleteClick = (categoryId: string) => {
    setDeleteId(categoryId)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/admin/categories/${deleteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: tCommon('status.success'),
          description: t('category_deleted'),
        })
        fetchCategories()
      } else {
        const errorData = await response.json()
        toast({
          title: tCommon('status.error'),
          description: errorData.message || t('messages.delete_error'),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: tCommon('status.error'),
        description: t('messages.network_error'),
        variant: 'destructive',
      })
    } finally {
      setDeleteOpen(false)
      setDeleteId(null)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      slug: '',
      parentId: null,
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

  const validateTranslationSlug = async (localeCode: string, name: string) => {
    const candidate = slugify(name || '')
    if (!candidate || candidate.length < 2) {
      setSlugValidationByLocale(prev => ({
        ...prev,
        [localeCode]: { isChecking: false, isValid: false, message: 'Slug en az 2 karakter olmalıdır' }
      }))
      return
    }
    setSlugValidationByLocale(prev => ({
      ...prev,
      [localeCode]: { ...(prev[localeCode] || { isValid: null, message: '' }), isChecking: true }
    }))
    try {
      const url = `/api/admin/validate-slug?slug=${encodeURIComponent(candidate)}&type=category&scope=translation&locale=${encodeURIComponent(localeCode)}${editingCategory?.id ? `&excludeId=${editingCategory.id}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setSlugValidationByLocale(prev => ({
          ...prev,
          [localeCode]: { isChecking: false, isValid: data.available, message: data.available ? 'Slug kullanılabilir' : 'Bu slug zaten kullanımda' }
        }))
      } else {
        setSlugValidationByLocale(prev => ({
          ...prev,
          [localeCode]: { isChecking: false, isValid: false, message: 'Slug kontrolü yapılamadı' }
        }))
      }
    } catch {
      setSlugValidationByLocale(prev => ({
        ...prev,
        [localeCode]: { isChecking: false, isValid: false, message: 'Slug kontrolü sırasında hata oluştu' }
      }))
    }
  }

  useEffect(() => {
    const timers: Record<string, any> = {}
    for (const tr of formData.translations) {
      const code = tr.locale
      timers[code] = setTimeout(() => {
        if (tr.name && tr.name.trim().length > 0) {
          validateTranslationSlug(code, tr.name)
        } else {
          setSlugValidationByLocale(prev => ({ ...prev, [code]: { isChecking: false, isValid: null, message: '' } }))
        }
      }, 500)
    }
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [JSON.stringify(formData.translations), editingCategory?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>{t('messages.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="h-4 w-4 mr-2" />
          {t('add_category')}
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('edit_category') : t('add_category')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">{t('form.basic_info')}</TabsTrigger>
                <TabsTrigger value="translations">
                  <Languages className="h-4 w-4 mr-2" />
                  {t('form.translations')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('form.category_name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('form.category_name_placeholder')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">{t('form.description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('form.description_placeholder')}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="parentId">{t('parent_category')}</Label>
                  <Select
                    value={formData.parentId ?? 'none'}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      parentId: value === 'none' ? null : value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_parent')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('no_parent')}</SelectItem>
                      {categories
                        .filter(cat => cat.id !== editingCategory?.id)
                        .map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.translations?.find(t => t.locale === localeParam)?.name || category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
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
                          {t('form.category_name')} ({locale.name})
                        </Label>
                        <Input
                          id={`name-${locale.code}`}
                          value={formData.translations.find(tl => tl.locale === locale.code)?.name || ''}
                          onChange={(e) => updateTranslation(locale.code, 'name', e.target.value)}
                          placeholder={`${t('form.category_name_placeholder')} (${locale.name})`}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`description-${locale.code}`}>
                          {t('form.description')} ({locale.name})
                        </Label>
                        <Textarea
                          id={`description-${locale.code}`}
                          value={formData.translations.find(tl => tl.locale === locale.code)?.description || ''}
                          onChange={(e) => updateTranslation(locale.code, 'description', e.target.value)}
                          placeholder={`${t('form.description_placeholder')} (${locale.name})`}
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label>Slug ({locale.name})</Label>
                        <div className="relative">
                          <Input
                            value={slugify(formData.translations.find(tl => tl.locale === locale.code)?.name || '')}
                            disabled
                            className={`pr-8 ${slugValidationByLocale[locale.code]?.isValid === true ? 'border-green-500' : slugValidationByLocale[locale.code]?.isValid === false ? 'border-red-500' : ''}`}
                          />
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            {slugValidationByLocale[locale.code]?.isChecking && (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            )}
                            {!slugValidationByLocale[locale.code]?.isChecking && slugValidationByLocale[locale.code]?.isValid === true && (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                            {!slugValidationByLocale[locale.code]?.isChecking && slugValidationByLocale[locale.code]?.isValid === false && (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                        {slugValidationByLocale[locale.code]?.message && (
                          <p className={`text-sm mt-1 ${slugValidationByLocale[locale.code]?.isValid ? 'text-green-600' : 'text-red-600'}`}>
                            {slugValidationByLocale[locale.code]?.message}
                          </p>
                        )}
                        {!slugValidationByLocale[locale.code]?.message && (
                          <p className="text-sm text-muted-foreground mt-1">Slug, çeviri adından otomatik oluşturulacak</p>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Button type="submit">
                {editingCategory ? tCommon('actions.update') : tCommon('actions.save')}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                {tCommon('actions.cancel')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>{t('navigation.categories')}</CardTitle>
          <CardDescription>
            {t('form.translations_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('no_categories')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.name')}</TableHead>
                  <TableHead>{t('table.description')}</TableHead>
                  <TableHead>{t('table.parent')}</TableHead>
                  <TableHead>{t('form.translations')}</TableHead>
                  <TableHead>{t('table.created_at')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.translations?.find(t => t.locale === localeParam)?.name || category.name}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground truncate">
                        {category.translations?.find(t => t.locale === localeParam)?.description || category.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      {category.parent ? (
                        <span className="text-sm text-blue-600">
                          {category.parent.translations?.find(t => t.locale === localeParam)?.name
                            || categories.find(c => c.id === category.parentId)?.translations?.find(t => t.locale === localeParam)?.name
                            || category.parent.name
                            || categories.find(c => c.id === category.parentId)?.name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(category.translations || []).map((translation) => (
                          <Badge key={translation.locale} variant="secondary" className="text-xs">
                            {SUPPORTED_LOCALES.find(l => l.code === translation.locale)?.code.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(category.createdAt).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteClick(category.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => router.push(`/${localeParam}/admin/categories/${category.id}/attributes`)}>
                          {t('manage_attributes')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm_delete_description') || "Bu işlem geri alınamaz. Bu kategoriyi silmek istediğinize emin misiniz?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tCommon('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}