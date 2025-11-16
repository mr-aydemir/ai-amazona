"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface AttrOptionRow {
  tr: string
  en: string
}

interface AttrForm {
  key: string
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT"
  unit: string
  isRequired: boolean
  filterable: boolean
  sortOrder: number
  translations: { locale: string; name: string }[]
  options: AttrOptionRow[]
}

export default function CategoryAttributesPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('admin.attributes')
  const tCommon = useTranslations('common')
  const { toast } = useToast()

  const locale = String(params?.locale || "tr")
  const categoryId = String(params?.id || "")

  const [loading, setLoading] = useState(false)
  const [attributes, setAttributes] = useState<any[]>([])
  const [categoryName, setCategoryName] = useState<string>("")

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingAttrId, setEditingAttrId] = useState<string | null>(null)

  const [attrForm, setAttrForm] = useState<AttrForm>({
    key: "",
    type: "TEXT",
    unit: "",
    isRequired: false,
    filterable: false,
    sortOrder: 0,
    translations: [
      { locale: "tr", name: "" },
      { locale: "en", name: "" },
    ],
    options: [],
  })

  useEffect(() => {
    if (!categoryId) return
    const fetchAll = async () => {
      try {
        setLoading(true)
        // Fetch category for header
        const catRes = await fetch(`/api/admin/categories/${categoryId}`)
        if (catRes.ok) {
          const cat = await catRes.json()
          setCategoryName(cat?.name ?? cat?.translations?.[0]?.name ?? "")
        }
        // Fetch attributes in current locale
        const res = await fetch(`/api/admin/categories/${categoryId}/attributes?locale=${locale}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Atributlar yüklenemedi")
        setAttributes(Array.isArray(data) ? data : [])
      } catch (err: any) {
        console.error(err)
        toast({ title: tCommon('status.error'), description: err.message || t('messages.fetch_error'), variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [categoryId, locale])

  const resetForm = () => {
    setAttrForm({
      key: "",
      type: "TEXT",
      unit: "",
      isRequired: false,
      filterable: false,
      sortOrder: 0,
      translations: [
        { locale: "tr", name: "" },
        { locale: "en", name: "" },
      ],
      options: [],
    })
    setEditingAttrId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setFormMode("create")
    setFormOpen(true)
  }

  const openEditModal = (attr: any) => {
    // Prefill form from current locale data; other locales left empty for admin to fill
    setAttrForm({
      key: attr.key || "",
      type: attr.type || "TEXT",
      unit: attr.unit || "",
      isRequired: !!attr.isRequired,
      filterable: !!attr.filterable,
      sortOrder: Number(attr.sortOrder ?? 0),
      translations: [
        { locale: "tr", name: locale === "tr" ? (attr.name || "") : "" },
        { locale: "en", name: locale === "en" ? (attr.name || "") : "" },
      ],
      options: Array.isArray(attr.options)
        ? attr.options.map((o: any) => ({ tr: locale === "tr" ? (o.name || "") : "", en: locale === "en" ? (o.name || "") : "" }))
        : [],
    })
    setEditingAttrId(attr.id)
    setFormMode("edit")
    setFormOpen(true)
  }

  const addOptionRow = () => setAttrForm(prev => ({ ...prev, options: [...prev.options, { tr: "", en: "" }] }))
  const removeOptionRow = (idx: number) => setAttrForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }))
  const updateOptionRow = (idx: number, field: "tr" | "en", value: string) => {
    setAttrForm(prev => ({
      ...prev,
      options: prev.options.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }))
  }

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        key: attrForm.key,
        type: attrForm.type,
        unit: attrForm.unit || null,
        isRequired: attrForm.isRequired,
        filterable: attrForm.filterable,
        sortOrder: attrForm.sortOrder,
        active: true,
        translations: attrForm.translations
          .filter(t => t.name && t.name.trim().length > 0)
          .map(t => ({ locale: t.locale, name: t.name.trim() })),
        options:
          attrForm.type === "SELECT"
            ? attrForm.options
              .filter(o => (o.tr || o.en) && (o.tr.trim().length > 0 || o.en.trim().length > 0))
              .map((o, idx) => ({
                key: undefined,
                sortOrder: idx,
                active: true,
                translations: [
                  ...(o.tr ? [{ locale: "tr", name: o.tr.trim() }] : []),
                  ...(o.en ? [{ locale: "en", name: o.en.trim() }] : []),
                ],
              }))
            : [],
      }

      const url =
        formMode === "create"
          ? `/api/admin/categories/${categoryId}/attributes`
          : `/api/admin/categories/${categoryId}/attributes/${editingAttrId}`
      const method = formMode === "create" ? "POST" : "PUT"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Kaydetme başarısız')

      toast({ title: tCommon('status.success'), description: formMode === 'create' ? t('messages.created') : t('messages.updated') })
      setFormOpen(false)
      resetForm()

      // Refresh list
      const listRes = await fetch(`/api/admin/categories/${categoryId}/attributes?locale=${locale}`)
      const listData = await listRes.json()
      setAttributes(Array.isArray(listData) ? listData : [])
    } catch (err: any) {
      console.error(err)
      toast({ title: tCommon('status.error'), description: err.message || t('messages.save_error'), variant: 'destructive' })
    }
  }

  const deleteAttribute = async (attrId: string) => {
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/attributes/${attrId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Silme başarısız')
      toast({ title: tCommon('status.success'), description: t('messages.deleted') })
      setAttributes(prev => prev.filter(a => a.id !== attrId))
    } catch (err: any) {
      console.error(err)
      toast({ title: tCommon('status.error'), description: err.message || t('messages.delete_error'), variant: 'destructive' })
    }
  }

  const goBack = () => {
    router.push(`/${locale}/admin/categories`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>{categoryName ? `${categoryName} - ${t('title')}` : t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={goBack}>{tCommon('actions.back')}</Button>
          <Button onClick={openCreateModal}>{t('add_attribute')}</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('list_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>{t('messages.loading')}</p>
          ) : attributes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_attributes')}</p>
          ) : (
            <div className="space-y-3">
              {attributes.map((attr) => (
                <div key={attr.id} className="border rounded p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{attr.name || attr.key}</div>
                      <div className="text-xs text-muted-foreground">{attr.type}{attr.unit ? ` (${attr.unit})` : ""}</div>
                      {Array.isArray(attr.options) && attr.options.length > 0 && (
                        <div className="mt-2 text-xs">
                          <div className="text-muted-foreground">{t('form.options')}:</div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {attr.options.map((opt: any) => (
                              <Badge key={opt.id} variant="secondary">{opt.name}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => openEditModal(attr)}>{tCommon('actions.edit')}</Button>
                      <Button type="button" variant="outline" onClick={() => deleteAttribute(attr.id)}>{tCommon('actions.delete')}</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? t('add_attribute') : t('edit_attribute')}</DialogTitle>
          </DialogHeader>

          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="attr-key">{t('form.key')}</Label>
                <Input id="attr-key" value={attrForm.key} onChange={(e) => setAttrForm(prev => ({ ...prev, key: e.target.value }))} placeholder={t('form.key_placeholder')} required />
              </div>
              <div>
                <Label htmlFor="attr-type">{t('form.type')}</Label>
                <Select value={attrForm.type} onValueChange={(v) => setAttrForm(prev => ({ ...prev, type: v as any }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.type_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">{t('types.text')}</SelectItem>
                    <SelectItem value="NUMBER">{t('types.number')}</SelectItem>
                    <SelectItem value="BOOLEAN">{t('types.boolean')}</SelectItem>
                    <SelectItem value="SELECT">{t('types.select')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="attr-unit">{t('form.unit')}</Label>
                <Input id="attr-unit" value={attrForm.unit} onChange={(e) => setAttrForm(prev => ({ ...prev, unit: e.target.value }))} placeholder={t('form.unit_placeholder')} />
              </div>
              <div>
                <Label htmlFor="attr-sort">{t('form.sort_order')}</Label>
                <Input id="attr-sort" type="number" value={attrForm.sortOrder} onChange={(e) => setAttrForm(prev => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-center gap-2">
                <input id="attr-required" type="checkbox" checked={attrForm.isRequired} onChange={(e) => setAttrForm(prev => ({ ...prev, isRequired: e.target.checked }))} />
                <Label htmlFor="attr-required">{t('form.is_required')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <input id="attr-filterable" type="checkbox" checked={attrForm.filterable} onChange={(e) => setAttrForm(prev => ({ ...prev, filterable: e.target.checked }))} />
                <Label htmlFor="attr-filterable">Filtrelenebilir</Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('form.attribute_name')} (TR)</Label>
                <Input value={attrForm.translations.find(t => t.locale === "tr")?.name || ""} onChange={(e) => setAttrForm(prev => ({ ...prev, translations: prev.translations.map(t => t.locale === "tr" ? { ...t, name: e.target.value } : t) }))} />
              </div>
              <div>
                <Label>{t('form.attribute_name')} (EN)</Label>
                <Input value={attrForm.translations.find(t => t.locale === "en")?.name || ""} onChange={(e) => setAttrForm(prev => ({ ...prev, translations: prev.translations.map(t => t.locale === "en" ? { ...t, name: e.target.value } : t) }))} />
              </div>
            </div>

            {attrForm.type === "SELECT" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('form.options')}</Label>
                  <Button type="button" variant="outline" onClick={addOptionRow}>{t('form.add_option')}</Button>
                </div>
                <div className="space-y-2">
                  {attrForm.options.map((opt, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                      <Input placeholder={`${t('form.option_placeholder')} (TR)`} value={opt.tr} onChange={(e) => updateOptionRow(idx, 'tr', e.target.value)} />
                      <Input placeholder={`${t('form.option_placeholder')} (EN)`} value={opt.en} onChange={(e) => updateOptionRow(idx, 'en', e.target.value)} />
                      <Button type="button" variant="outline" onClick={() => removeOptionRow(idx)}>{tCommon('actions.remove')}</Button>
                    </div>
                  ))}
                  {/* Options hint intentionally removed to avoid untranslated text */}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="submit">{formMode === "create" ? tCommon('actions.save') : tCommon('actions.update')}</Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{tCommon('actions.cancel')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
