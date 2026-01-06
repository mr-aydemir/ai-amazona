"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import ProductForm from "@/components/admin/product-form"
import { Plus } from "lucide-react"

interface AdminVariantItem {
  id: string
  name: string
  image?: string
  label?: string
}

interface Category { id: string; name: string }
interface ProductTranslation { locale: string; name: string; description: string }
interface ProductFormData {
  name: string
  description: string
  slug?: string
  price: string
  stock: string
  categoryId: string
  status: "ACTIVE" | "INACTIVE"
  images: string[]
  translations: ProductTranslation[]
}

export default function VariantsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations("admin.products.variants")
  const { toast } = useToast()

  const productId = params.id as string
  const urlVariantId = searchParams.get('variantId')

  const [items, setItems] = useState<AdminVariantItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(urlVariantId)
  const [productName, setProductName] = useState("")
  const [loading, setLoading] = useState(true)
  const [variantAttributeId, setVariantAttributeId] = useState<string | null>(null)
  const [variantAttributeIds, setVariantAttributeIds] = useState<string[]>([])
  const [dimensionAttributes, setDimensionAttributes] = useState<Array<{ id: string; name: string; type: string }>>([])
  const [attrModalOpen, setAttrModalOpen] = useState(false)
  const [attrSearch, setAttrSearch] = useState("")

  const [categories, setCategories] = useState<Category[]>([])
  const [initialData, setInitialData] = useState<ProductFormData | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Update URL when selection changes
  const updateSelection = (id: string | null) => {
    setSelectedId(id)
    const params = new URLSearchParams(searchParams.toString())
    if (id) {
      params.set('variantId', id)
    } else {
      params.delete('variantId')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    const fetchInitial = async () => {
      if (!productId) return
      await fetchVariants()
      await fetchProductDetails()
    }
    fetchInitial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const fetchVariants = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/products/${productId}/variants`)
      if (!response.ok) throw new Error("Failed to fetch variants")
      const data = await response.json()
      const list: AdminVariantItem[] = (data.variants || []).map((p: any) => {
        let img = undefined
        try {
          const arr = JSON.parse(p.images || "[]")
          img = Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined
        } catch { }
        return { id: p.id, name: p.name, image: img }
      })
      setItems(list)
      setVariantAttributeId(data.variantAttributeId || null)
      setVariantAttributeIds(Array.isArray(data.variantAttributeIds) ? data.variantAttributeIds : [])
      
      // Determine initial selection
      if (list.length > 0) {
        // If we have a URL param and it's valid, stick with it (already set in state init, but strictly verify)
        // If selectedId is null or not in list, fallback to first
        const currentValid = list.find(l => l.id === selectedId) || list.find(l => l.id === urlVariantId)
        
        if (currentValid) {
           if (selectedId !== currentValid.id) updateSelection(currentValid.id)
        } else {
           updateSelection(list[0].id)
        }
      } else {
        updateSelection(null)
      }
    } catch (err) {
      console.error("Error fetching variants:", err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProductDetails = async () => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`)
      if (response.ok) {
        const data = await response.json()
        try {
          const translations: { locale: string; name?: string }[] = Array.isArray(data?.product?.translations)
            ? data.product.translations
            : []
          const base = String(locale || '').split('-')[0]
          const exact = translations.find(t => t.locale === locale)?.name
          const baseMatch = translations.find(t => t.locale === base)?.name
          const nameOut = (exact && exact.trim()) || (baseMatch && baseMatch.trim()) || data.product.name || ''
          setProductName(nameOut)
          const attrsResp = await fetch(`/api/admin/products/${productId}/attributes?locale=${locale}`)
          if (attrsResp.ok) {
            const attrsJson = await attrsResp.json()
            const list = Array.isArray(attrsJson?.attributes) ? attrsJson.attributes : []
            const filtered = list.filter((a: any) => a?.type === 'SELECT' || String(a?.key || '').toLowerCase() === 'variant_option')
            const dedup = new Map<string, { id: string; name: string; type: string }>()
            filtered.forEach((a: any) => {
              const id = String(a.id)
              if (!dedup.has(id)) dedup.set(id, { id, name: a.name || a.key, type: a.type })
            })
            setDimensionAttributes(Array.from(dedup.values()))
          }
        } catch {
          setProductName(data.product?.name || '')
        }
      }
    } catch (error) {
      console.error("Error fetching product details:", error)
    }
  }

  // Sağ form için gerekli veriler
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const resp = await fetch("/api/admin/categories")
        const data = await resp.json()
        setCategories(data)
      } catch (e) {
        console.error("Categories fetch error:", e)
      }
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    const applyDefaultDimension = async () => {
      if (variantAttributeId) return
      if (!productId || dimensionAttributes.length === 0) return
      const colorAttr = dimensionAttributes.find(a => a.name?.toLowerCase() === 'renk')
      const fallbackSelect = dimensionAttributes.find(a => a.type === 'SELECT')
      const chosen = colorAttr || fallbackSelect || null
      if (chosen?.id) {
        try {
          setVariantAttributeId(chosen.id)
          await fetch(`/api/admin/products/${productId}/variants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variantAttributeId: chosen.id, variants: [] }),
          })
          await fetchVariants()
        } catch (err) {
          console.error('Failed to set default variant dimension:', err)
        }
      }
    }
    applyDefaultDimension()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensionAttributes, variantAttributeId, productId])

  useEffect(() => {
    const fetchSelectedProduct = async () => {
      if (!selectedId) return
      try {
        const response = await fetch(`/api/admin/products/${selectedId}`)
        if (!response.ok) return
        const data = await response.json()
        const p = data.product
        const formData: ProductFormData = {
          name: p.name,
          description: p.description,
          slug: p.slug,
          price: String(p.price ?? "0"),
          stock: String(p.stock ?? "0"),
          categoryId: p.categoryId || "",
          status: p.status,
          images: Array.isArray(p.images) ? p.images : [],
          translations: (p.translations || []).map((tr: any) => ({
            locale: tr.locale,
            name: tr.name,
            description: tr.description,
          })),
        }
        setInitialData(formData)
      } catch (e) {
        console.error("Selected product fetch error:", e)
        setInitialData(null)
      }
    }
    fetchSelectedProduct()
  }, [selectedId])

  const handleSubmit = async (data: ProductFormData) => {
    if (!selectedId) return
    setSubmitting(true)
    try {
      const submitData = {
        ...data,
        price: parseFloat(data.price),
        stock: parseInt(data.stock, 10),
      }
      const response = await fetch(`/api/admin/products/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...submitData,
          slug: data.slug,
          translations: data.translations,
        }),
      })
      if (response.ok) {
        toast({ title: "Başarılı", description: "Ürün güncellendi" })
        await fetchVariants()
      } else {
        const err = await response.json()
        toast({ title: "Hata", description: err.error || "Ürün güncellenemedi", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Ağ Hatası", description: "Güncelleme sırasında hata oluştu", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const addVariant = () => {
    // Primary ürünü klonlayan API'yi çağır
    (async () => {
      try {
        const resp = await fetch(`/api/admin/products/${productId}/variants/add`, { method: 'POST' })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          throw new Error(err.error || 'Varyant oluşturulamadı')
        }
        const data = await resp.json()
        const newId: string | undefined = data?.variant?.id
        toast({ title: 'Başarılı', description: 'Varyant klonlandı' })
        await fetchVariants()
        if (newId) updateSelection(newId)
      } catch (e: any) {
        toast({ title: 'Hata', description: e?.message || 'Varyant eklenemedi', variant: 'destructive' })
      }
    })()
  }

  const headerTitle = useMemo(() => t("title"), [t])

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-start gap-6">
        {/* Left: Variants list */}
        <div className="w-full lg:w-1/3 xl:w-1/4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{t("variants_list")}</div>
                <Button onClick={addVariant} variant="outline">
                  <Plus className="h-4 w-4 mr-2" /> {t("add_variant")}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Varyant Özellikleri</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setAttrModalOpen(true)}>
                    Özellikleri Seç
                  </Button>
                  <div className="text-xs text-muted-foreground truncate max-w-[60%]">
                    {variantAttributeIds.length > 0
                      ? variantAttributeIds
                          .map((id) => dimensionAttributes.find((a) => a.id === id)?.name || id)
                          .join(', ')
                      : 'Seçilmedi'}
                  </div>
                </div>

                <Dialog open={attrModalOpen} onOpenChange={setAttrModalOpen}>
                  <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Varyant Özellikleri Seç</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Input
                        placeholder="Özellik ara..."
                        value={attrSearch}
                        onChange={(e) => setAttrSearch(e.target.value)}
                      />
                      <div className="space-y-2">
                        {(attrSearch
                          ? dimensionAttributes.filter((a) => (a.name || '').toLowerCase().includes(attrSearch.toLowerCase()))
                          : dimensionAttributes
                        ).map((a) => {
                          const checked = variantAttributeIds.includes(a.id) || (variantAttributeId === a.id)
                          return (
                            <label key={a.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                defaultChecked={checked}
                                onChange={async (e) => {
                                  try {
                                    const current = new Set<string>(variantAttributeIds)
                                    if (e.target.checked) current.add(a.id)
                                    else current.delete(a.id)
                                    const ids = Array.from(current)
                                    setVariantAttributeIds(ids)
                                    setVariantAttributeId(ids.length === 1 ? ids[0] : null)
                                    const resp = await fetch(`/api/admin/products/${productId}/variants`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ variantAttributeIds: ids, variants: [] }),
                                    })
                                    if (!resp.ok) {
                                      const err = await resp.json().catch(() => ({}))
                                      toast({ title: 'Hata', description: err?.error || 'Seçim kaydedilemedi', variant: 'destructive' })
                                    } else {
                                      toast({ title: 'Kaydedildi', description: 'Varyant boyutları güncellendi' })
                                      await fetchVariants()
                                    }
                                  } catch (err) {
                                    console.error('Failed to update variant dimensions:', err)
                                    toast({ title: 'Ağ Hatası', description: 'Seçim kaydedilemedi', variant: 'destructive' })
                                  }
                                }}
                              />
                              <span>{a.name}</span>
                            </label>
                          )
                        })}
                      </div>
                      <div className="flex justify-end">
                        <Button variant="outline" onClick={() => setAttrModalOpen(false)}>Kapat</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                {variantAttributeIds.length > 1 && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Seçim Sırası</div>
                    {variantAttributeIds.map((id, idx) => {
                      const attr = dimensionAttributes.find(a => a.id === id)
                      return (
                        <div key={id} className="flex items-center gap-2">
                          <span className="text-sm flex-1">{attr?.name || id}</span>
                          <button
                            className="px-2 py-1 border rounded text-xs"
                            onClick={async () => {
                              if (idx === 0) return
                              const next = [...variantAttributeIds]
                              const tmp = next[idx - 1]
                              next[idx - 1] = next[idx]
                              next[idx] = tmp
                              setVariantAttributeIds(next)
                              const resp = await fetch(`/api/admin/products/${productId}/variants`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ variantAttributeIds: next, variants: [] }),
                              })
                              if (!resp.ok) {
                                const err = await resp.json().catch(() => ({}))
                                toast({ title: 'Hata', description: err?.error || 'Sıra kaydedilemedi', variant: 'destructive' })
                              } else {
                                toast({ title: 'Kaydedildi', description: 'Seçim sırası güncellendi' })
                                await fetchVariants()
                              }
                            }}
                          >↑</button>
                          <button
                            className="px-2 py-1 border rounded text-xs"
                            onClick={async () => {
                              if (idx === variantAttributeIds.length - 1) return
                              const next = [...variantAttributeIds]
                              const tmp = next[idx + 1]
                              next[idx + 1] = next[idx]
                              next[idx] = tmp
                              setVariantAttributeIds(next)
                              const resp = await fetch(`/api/admin/products/${productId}/variants`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ variantAttributeIds: next, variants: [] }),
                              })
                              if (!resp.ok) {
                                const err = await resp.json().catch(() => ({}))
                                toast({ title: 'Hata', description: err?.error || 'Sıra kaydedilemedi', variant: 'destructive' })
                              } else {
                                toast({ title: 'Kaydedildi', description: 'Seçim sırası güncellendi' })
                                await fetchVariants()
                              }
                            }}
                          >↓</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="text-sm text-muted-foreground">Yükleniyor...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("empty")}</div>
              ) : (
                <div className="space-y-2">
                  {items.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => updateSelection(v.id)}
                      className={`w-full flex items-center gap-3 rounded border p-2 text-left hover:bg-accent ${selectedId === v.id ? "border-primary bg-accent" : "border-muted"}`}
                    >
                      <div className="w-12 h-12 overflow-hidden rounded bg-muted">
                        {v.image ? (
                          <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No Image</div>
                        )}
                      </div>
                      <div className="flex-1 text-sm font-medium truncate">{v.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Product edit form */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{headerTitle}</h1>
              <p className="text-sm text-muted-foreground">{t("description", { productName })}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.back()}>{t("back_to_products")}</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!selectedId) return
                  if (selectedId === productId) {
                    toast({ title: 'Uyarı', description: t('cannot_delete_primary'), variant: 'destructive' })
                    return
                  }
                  try {
                    const resp = await fetch(`/api/admin/products/${selectedId}`, { method: 'DELETE' })
                    if (!resp.ok) {
                      const err = await resp.json().catch(() => ({}))
                      throw new Error(err.error || 'Varyant silinemedi')
                    }
                    toast({ title: 'Başarılı', description: t('deleted') })
                    await fetchVariants()
                    // Yeni listede ilk öğeyi seç
                    const next = items.find((i) => i.id !== selectedId)?.id || null
                    updateSelection(next)
                  } catch (e: any) {
                    toast({ title: 'Hata', description: e?.message || 'Silme sırasında hata', variant: 'destructive' })
                  }
                }}
              >
                {t('delete_variant')}
              </Button>
            </div>
          </div>

          {initialData && categories.length > 0 ? (
            <ProductForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={() => router.back()}
              onBack={() => router.back()}
              title={t("title")}
              submitButtonText={t("save_changes")}
              loading={submitting}
              categories={categories}
              productId={selectedId ?? undefined}
            />
          ) : (
            <div className="rounded border p-6 text-sm text-muted-foreground">{t("select_hint")}</div>
          )}
        </div>
      </div>
    </div>
  )
}
