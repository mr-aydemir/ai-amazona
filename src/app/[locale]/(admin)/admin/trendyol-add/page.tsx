'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown } from 'lucide-react'

type AdminProduct = {
  id: string
  name: string
  price: number
  stock: number
  status: string
  image: string
}

export default function TrendyolAddPage() {
  const [locale, setLocale] = useState<'tr' | 'en'>('tr')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminProduct | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null)

  const [categoryId, setCategoryId] = useState<string>('')
  const [cargoCompanyId, setCargoCompanyId] = useState<string>('')
  const [brandId, setBrandId] = useState<string>('')
  const [brandName, setBrandName] = useState<string>('')
  const [barcode, setBarcode] = useState<string>('')
  const [stockCode, setStockCode] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [vatRate, setVatRate] = useState<string>('20')
  const [deliveryDuration, setDeliveryDuration] = useState<string>('1')
  const [priceMultiplier, setPriceMultiplier] = useState<string>('1')
  const [dimensionalWeight, setDimensionalWeight] = useState<string>('1')
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<any | null>(null)

  // Trendyol referans listeleri
  const [brands, setBrands] = useState<Array<{ id: number, name: string }>>([])
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [brandSearch, setBrandSearch] = useState('')
  const [brandsError, setBrandsError] = useState<string | null>(null)
  const [brandOpen, setBrandOpen] = useState(false)

  const [providers, setProviders] = useState<Array<{ id: number, code?: string, name: string }>>([])
  const [providersLoading, setProvidersLoading] = useState(false)
  const [providersError, setProvidersError] = useState<string | null>(null)

  type CategoryNode = { id: number, name: string, parentId?: number, subCategories?: CategoryNode[] }
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [categoryOpen, setCategoryOpen] = useState(false)

  type CategoryAttribute = {
    categoryId: number,
    attribute: { id: number, name: string },
    required: boolean,
    allowCustom: boolean,
    varianter?: boolean,
    slicer?: boolean,
    attributeValues?: Array<{ id: number, name: string }>
  }
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([])
  const [attributesLoading, setAttributesLoading] = useState(false)
  const [selectedAttributes, setSelectedAttributes] = useState<Record<number, { attributeValueId?: number, customAttributeValue?: string }>>({})

  const fetchList = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = search
        ? `/api/admin/products?search=${encodeURIComponent(search)}&limit=50&locale=${encodeURIComponent(locale)}`
        : `/api/admin/products/list?limit=50&locale=${encodeURIComponent(locale)}`
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'API hata')
      } else {
        const items = json?.items ?? json?.products ?? []
        setProducts(items)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  const fetchDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Ürün detayı alınamadı')
      } else {
        setSelectedDetail(json)
        // Pre-fill mapping fields
        setBarcode(id)
        setStockCode(id)
        setQuantity(String(json?.stock ?? selected?.stock ?? 0))
      }
    } catch (e: any) {
      setError(e?.message ?? 'Ürün detayı alınamadı')
    }
  }

  useEffect(() => {
    fetchList()
    // İlk yüklemede referans verileri getir
    fetchProviders()
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Marka arama değişince listeyi güncelle
    const doFetch = async () => {
      await fetchBrands(brandSearch)
    }
    doFetch()
  }, [brandSearch])

  const onSelectProduct = (p: AdminProduct) => {
    setSelected(p)
    fetchDetail(p.id)
  }

  const fetchBrands = async (search: string) => {
    try {
      setBrandsLoading(true)
      setBrandsError(null)
      const url = `/api/trendyol/brands?size=1000${search ? `&search=${encodeURIComponent(search)}` : ''}`
      const res = await fetch(url)
      const json = await res.json()
      if (res.ok) {
        setBrands(json?.brands || [])
        if (!Array.isArray(json?.brands) || (json?.brands || []).length === 0) {
          setBrandsError('Marka listesi boş veya yüklenemedi. Manuel ID girin.')
        }
      } else {
        setBrands([])
        setBrandsError(`Marka listesi alınamadı (HTTP ${res.status}). Manuel ID girin.`)
      }
    } catch { }
    finally { setBrandsLoading(false) }
  }

  const fetchProviders = async () => {
    try {
      setProvidersLoading(true)
      setProvidersError(null)
      const res = await fetch('/api/trendyol/providers')
      const json = await res.json()
      if (res.ok) {
        const arr = json?.providers || []
        setProviders(arr)
        if (!Array.isArray(arr) || arr.length === 0) {
          setProvidersError('Kargo listesi boş veya yüklenemedi. Manuel ID girin.')
        }
      } else {
        setProviders([])
        setProvidersError(`Kargo listesi alınamadı (HTTP ${res.status}). Manuel ID girin.`)
      }
    } catch { }
    finally { setProvidersLoading(false) }
  }

  const flattenCategories = (nodes: CategoryNode[]): Array<{ id: number, name: string, parentId?: number }> => {
    // Only leaf categories (no subCategories) are valid for createProduct V2
    const out: Array<{ id: number, name: string, parentId?: number }> = []
    const walk = (node: CategoryNode) => {
      const hasChildren = Array.isArray(node.subCategories) && node.subCategories.length > 0
      if (!hasChildren) {
        out.push({ id: node.id, name: node.name, parentId: node.parentId })
      } else {
        node.subCategories!.forEach(walk)
      }
    }
    nodes.forEach(walk)
    return out
  }

  const [flatCategories, setFlatCategories] = useState<Array<{ id: number, name: string, parentId?: number }>>([])

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true)
      setCategoriesError(null)
      const res = await fetch('/api/trendyol/categories')
      const json = await res.json()
      if (res.ok) {
        const tree: CategoryNode[] = Array.isArray(json) ? json : (json?.categories || json?.subCategories || [])
        setCategoryTree(tree)
        setFlatCategories(flattenCategories(tree))
        if (!Array.isArray(tree) || tree.length === 0) {
          setCategoriesError('Kategori listesi boş veya yüklenemedi. Manuel ID girin.')
        }
      } else {
        setCategoryTree([])
        setFlatCategories([])
        setCategoriesError(`Kategori listesi alınamadı (HTTP ${res.status}). Manuel ID girin.`)
      }
    } catch { }
    finally { setCategoriesLoading(false) }
  }

  const fetchAttributes = async (cid: number) => {
    try {
      setAttributesLoading(true)
      const res = await fetch(`/api/trendyol/category-attributes?categoryId=${encodeURIComponent(cid)}`)
      const json = await res.json()
      if (res.ok) {
        const arr: CategoryAttribute[] = json?.categoryAttributes || json || []
        setCategoryAttributes(arr)
      } else {
        setCategoryAttributes([])
      }
    } catch { setCategoryAttributes([]) }
    finally { setAttributesLoading(false) }
  }

  const handleUpdateAllImages = async () => {
    setLoading(true)
    setError(null)

    const fetchPage = async (page: number) => {
      const url = search
        ? `/api/admin/products?search=${encodeURIComponent(search)}&limit=50&locale=${encodeURIComponent(locale)}&page=${page}`
        : `/api/admin/products/list?limit=50&locale=${encodeURIComponent(locale)}&page=${page}`
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || 'API hata')
      }
      return {
        products: json?.items ?? json?.products ?? [],
        totalPages: json?.totalPages ?? 1,
      }
    }

    try {
      let allProducts: AdminProduct[] = []
      let currentPage = 1
      let totalPages = 1

      do {
        const data = await fetchPage(currentPage)
        allProducts = allProducts.concat(data.products)
        totalPages = data.totalPages
        currentPage++
      } while (currentPage <= totalPages)

      const response = await fetch('/api/admin/products/update-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: allProducts }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'An error occurred')
      }
      alert(
        `Tüm resimler güncellendi. ${result.updated} güncellendi, ${result.skipped} atlandı.`
      )
    } catch (err: any) {
      setError(err.message)
      alert(`Hata: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }



  const onSubmit = async () => {
    const category = Number(categoryId)
    const cargo = Number(cargoCompanyId)
    const brandIdNum = brandId ? Number(brandId) : undefined
    const qty = Number(quantity)
    const vat = Number(vatRate)
    const dd = Number(deliveryDuration)
    const pm = Number(priceMultiplier)
    const dw = Number(dimensionalWeight)

    if (!selected) {
      alert('Önce bir ürün seçin')
      return
    }
    if (!Number.isFinite(category) || category <= 0) {
      alert('Geçerli Trendyol kategori ID girin')
      return
    }
    if (!Number.isFinite(cargo) || cargo <= 0) {
      alert('Geçerli kargo şirketi ID girin')
      return
    }
    if (!Number.isFinite(dw) || dw <= 0) {
      alert('Geçerli desi (boyutsal ağırlık) girin')
      return
    }
    if (!Number.isFinite(brandIdNum || NaN)) {
      alert('Marka seçimi zorunlu')
      return
    }

    const attrsPayload = Object.entries(selectedAttributes).map(([k, v]) => {
      const attributeId = Number(k)
      if (v.attributeValueId) return { attributeId, attributeValueId: v.attributeValueId }
      if (v.customAttributeValue) return { attributeId, customAttributeValue: v.customAttributeValue }
      return null
    }).filter(Boolean)

    try {
      setSubmitting(true)
      setSubmitResult(null)
      const res = await fetch('/api/admin/trendyol/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selected.id,
          categoryId: category,
          cargoCompanyId: cargo,
          brandId: brandIdNum,
          barcode: barcode || undefined,
          stockCode: stockCode || undefined,
          quantity: Number.isFinite(qty) ? qty : undefined,
          vatRate: Number.isFinite(vat) ? vat : undefined,
          deliveryDuration: Number.isFinite(dd) ? dd : undefined,
          priceMultiplier: Number.isFinite(pm) ? pm : undefined,
          dimensionalWeight: dw,
          attributes: attrsPayload,
          locale,
        }),
      })
      const json = await res.json()
      setSubmitResult(json)
      if (!res.ok) {
        alert(`Hata: ${json?.error || 'Trendyol API hata'}`)
      } else {
        alert('Trendyol’a gönderim isteği oluşturuldu')
      }
    } catch (e: any) {
      alert(e?.message ?? 'Gönderim hatası')
    } finally {
      setSubmitting(false)
    }
  }

  const productGrid = useMemo(() => (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
      {products.map((p) => (
        <button
          key={p.id}
          className={`text-left border rounded overflow-hidden hover:shadow-sm transition ${selected?.id === p.id ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => onSelectProduct(p)}
        >
          <div className='aspect-square bg-muted'>
            <img src={p.image} alt={p.name} className='w-full h-full object-cover' />
          </div>
          <div className='p-2'>
            <div className='text-sm font-medium line-clamp-2'>{p.name}</div>
            <div className='text-xs text-muted-foreground mt-1'>Stok: {p.stock}</div>
          </div>
        </button>
      ))}
    </div>
  ), [products, selected])

  return (
    <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-6'>
      <h1 className='text-2xl font-bold mb-4'>Trendyol’a Ürün Ekle</h1>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left: List and search */}
        <div className='lg:col-span-2'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-48'>
              <Label className='mb-1 block'>Dil</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as 'tr' | 'en')}>
                <SelectTrigger><SelectValue placeholder='Dil seçin' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='tr'>Türkçe</SelectItem>
                  <SelectItem value='en'>İngilizce</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='flex-1'>
              <Label className='mb-1 block'>Arama</Label>
              <div className='flex items-center gap-2'>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Ürün adıyla ara' />
                <Button variant='outline' onClick={fetchList} disabled={loading}>{loading ? 'Yükleniyor...' : 'Ara'}</Button>
              </div>
            </div>
          </div>
          {error && <div className='mt-2 text-red-600 text-sm'>Hata: {error}</div>}
          {productGrid}
          <div className='mt-4 text-xs text-muted-foreground'>Toplam: {products.length} ürün. Detay ve alanlar için ürün seçin.</div>
        </div>

        {/* Right: Mapping form */}
        <div className='lg:col-span-1'>
          <div className='rounded-lg border bg-card p-4'>
            <div className='text-lg font-semibold mb-3'>Alan Eşleştirme</div>
            {selected ? (
              <>
                <div className='flex items-center gap-3 mb-3'>
                  <img src={selected.image} alt={selected.name} className='w-12 h-12 rounded object-cover' />
                  <div>
                    <div className='font-medium'>{selected.name}</div>
                    <div className='text-xs text-muted-foreground'>ID: {selected.id}</div>
                  </div>
                </div>

                <div className='space-y-3'>
                  <div>
                    <Label className='block mb-1'>Kategori Seçimi</Label>
                    {flatCategories.length > 0 ? (
                      <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                        <PopoverTrigger asChild>
                          <Button variant='outline' role='combobox' aria-expanded={categoryOpen} className='w-full justify-between'>
                            {categoryId ? (
                              (flatCategories.find(c => c.id === Number(categoryId))?.name || 'Kategori seçin')
                            ) : (
                              'Kategori seçin'
                            )}
                            <ChevronsUpDown className='ml-2 h-4 w-4 opacity-50' />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='p-0 w-[30rem]'>
                          <Command>
                            <CommandInput
                              placeholder='Kategori ara...'
                              value={categorySearch}
                              onValueChange={(value) => setCategorySearch(value)}
                            />
                            <CommandList>
                              <CommandEmpty>Kategori bulunamadı</CommandEmpty>
                              <CommandGroup>
                                {(categorySearch ? flatCategories.filter(c => c.name.toLocaleLowerCase('tr-TR').includes(categorySearch.toLocaleLowerCase('tr-TR'))) : flatCategories)
                                  .slice(0, 500)
                                  .map(c => (
                                    <CommandItem
                                      key={c.id}
                                      onSelect={() => { setCategoryId(String(c.id)); const cid = c.id; if (Number.isFinite(cid) && cid > 0) fetchAttributes(cid); setCategoryOpen(false) }}
                                    >
                                      <Check className={cn('mr-2 h-4 w-4', Number(categoryId) === c.id ? 'opacity-100' : 'opacity-0')} />
                                      {c.name} (#{c.id})
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className='space-y-2'>
                        {categoriesError && <div className='text-xs text-red-500'>{categoriesError}</div>}
                        <Input type='number' value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder='Kategori ID girin (ör. 123456)' />
                        <Button variant='outline' onClick={() => { const cid = Number(categoryId); if (Number.isFinite(cid) && cid > 0) fetchAttributes(cid) }}>Özellikleri Yükle</Button>
                      </div>
                    )}
                    <div className='mt-2 text-xs text-muted-foreground'>
                      Not: createProduct için en alt seviyedeki kategori ID kullanılmalıdır. Listede yalnızca yaprak (alt kategorisi olmayan) kategoriler gösterilir.
                    </div>
                  </div>
                  <div>
                    <Label className='block mb-1'>Kargo Şirketi</Label>
                    {providers.length > 0 ? (
                      <Select value={cargoCompanyId} onValueChange={(v) => setCargoCompanyId(v)}>
                        <SelectTrigger><SelectValue placeholder='Kargo şirketi seçin' /></SelectTrigger>
                        <SelectContent>
                          {providers.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name} (#{p.id})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className='space-y-2'>
                        {providersError && <div className='text-xs text-red-500'>{providersError}</div>}
                        <Input type='number' value={cargoCompanyId} onChange={(e) => setCargoCompanyId(e.target.value)} placeholder='Kargo şirketi ID girin' />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className='block mb-1'>Marka</Label>
                    {brands.length > 0 ? (
                      <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                        <PopoverTrigger asChild>
                          <Button variant='outline' role='combobox' aria-expanded={brandOpen} className='w-full justify-between'>
                            {brandId ? (
                              (brands.find(b => b.id === Number(brandId))?.name || 'Marka seçin (zorunlu)')
                            ) : (
                              'Marka seçin (zorunlu)'
                            )}
                            <ChevronsUpDown className='ml-2 h-4 w-4 opacity-50' />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className='p-0 w-[24rem]'>
                          <Command>
                            <CommandInput
                              placeholder='Marka ara...'
                              value={brandSearch}
                              onValueChange={(value) => setBrandSearch(value)}
                            />
                            <CommandList>
                              <CommandEmpty>Marka bulunamadı</CommandEmpty>
                              <CommandGroup>
                                {brands.slice(0, 1000).map(b => (
                                  <CommandItem
                                    key={b.id}
                                    onSelect={() => { setBrandId(String(b.id)); setBrandOpen(false) }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', Number(brandId) === b.id ? 'opacity-100' : 'opacity-0')} />
                                    {b.name} (#{b.id})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className='space-y-2'>
                        {brandsError && <div className='text-xs text-red-500'>{brandsError}</div>}
                        <Input type='number' value={brandId} onChange={(e) => setBrandId(e.target.value)} placeholder='Marka ID girin (zorunlu)' />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className='block mb-1'>Barkod (opsiyonel)</Label>
                    <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder='Varsayılan: ürün ID' />
                  </div>
                  <div>
                    <Label className='block mb-1'>Stok Kodu (opsiyonel)</Label>
                    <Input value={stockCode} onChange={(e) => setStockCode(e.target.value)} placeholder='Varsayılan: ürün ID' />
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <Label className='block mb-1'>Adet</Label>
                      <Input type='number' value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder='Varsayılan: ürün stoğu' />
                    </div>
                    <div>
                      <Label className='block mb-1'>KDV (%)</Label>
                      <Input type='number' value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
                    </div>
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <Label className='block mb-1'>Teslim Süresi (gün)</Label>
                      <Input type='number' value={deliveryDuration} onChange={(e) => setDeliveryDuration(e.target.value)} />
                    </div>
                    <div>
                      <Label className='block mb-1'>Fiyat Çarpanı</Label>
                      <Input type='number' step='0.01' value={priceMultiplier} onChange={(e) => setPriceMultiplier(e.target.value)} placeholder='Örn. 1.2' />
                    </div>
                  </div>
                  <div>
                    <Label className='block mb-1'>Boyutsal Ağırlık (Desi)</Label>
                    <Input type='number' step='0.1' value={dimensionalWeight} onChange={(e) => setDimensionalWeight(e.target.value)} placeholder='Örn. 1.0' />
                  </div>
                  {categoryId && (
                    <div className='mt-3'>
                      <div className='font-medium mb-2'>Kategori Özellikleri</div>
                      {attributesLoading ? (
                        <div className='text-sm text-muted-foreground'>Yükleniyor...</div>
                      ) : categoryAttributes.length === 0 ? (
                        <div className='text-sm text-muted-foreground'>Bu kategori için özellik bulunamadı veya gerekli değil.</div>
                      ) : (
                        <div className='space-y-3'>
                          {categoryAttributes.slice(0, 30).map(attr => (
                            <div key={attr.attribute.id}>
                              <Label className='block mb-1'>{attr.attribute.name}{attr.required ? ' *' : ''}</Label>
                              {Array.isArray(attr.attributeValues) && attr.attributeValues.length > 0 ? (
                                <Select
                                  value={String(selectedAttributes[attr.attribute.id]?.attributeValueId || '')}
                                  onValueChange={(v) => setSelectedAttributes(prev => ({
                                    ...prev,
                                    [attr.attribute.id]: { attributeValueId: Number(v) }
                                  }))}
                                >
                                  <SelectTrigger><SelectValue placeholder='Değer seçin' /></SelectTrigger>
                                  <SelectContent>
                                    {attr.attributeValues!.map(v => (
                                      <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : null}
                              {attr.allowCustom && (
                                <Input
                                  className='mt-2'
                                  value={selectedAttributes[attr.attribute.id]?.customAttributeValue || ''}
                                  onChange={(e) => setSelectedAttributes(prev => ({
                                    ...prev,
                                    [attr.attribute.id]: { customAttributeValue: e.target.value }
                                  }))}
                                  placeholder='Özel değer girin'
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className='text-xs text-muted-foreground'>
                    Not: Sistem fiyatı TRY’ye çevrilir ve çarpan ile güncellenir.
                  </div>
                  <div className='flex items-center justify-between'>
                    <Button onClick={onSubmit} disabled={submitting || !selected}>
                      {submitting ? 'Gönderiliyor...' : 'Trendyol’a Gönder'}
                    </Button>
                  </div>
                </div>

                {submitResult && (
                  <div className='mt-4 text-xs'>
                    <div className='font-medium mb-1'>Sonuç</div>
                    <pre className='bg-muted p-2 rounded overflow-auto max-h-64'>
                      {JSON.stringify(submitResult, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className='text-sm text-muted-foreground'>Sağdaki alanları görmek ve doldurmak için sol taraftan bir ürün seçin.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}