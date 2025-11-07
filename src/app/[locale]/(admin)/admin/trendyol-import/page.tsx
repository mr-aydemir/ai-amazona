'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency } from '@/lib/utils'

export default function TrendyolImportPage() {
  const [page, setPage] = useState(0)
  const size = 50
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<any | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadSelectedOpen, setUploadSelectedOpen] = useState(false)
  const [updateImagesOpen, setUpdateImagesOpen] = useState(false)
  const [updateAllImagesOpen, setUpdateAllImagesOpen] = useState(false)
  const [ratio, setRatio] = useState<string>('1')
  const [uploading, setUploading] = useState(false)
  const [uploadStats, setUploadStats] = useState<{ current: number, total: number, created: number, updated: number, processed: number }>({ current: 0, total: 0, created: 0, updated: 0, processed: 0 })

  const products = useMemo(() => {
    const list = Array.isArray(data?.content)
      ? data.content
      : Array.isArray(data?.items)
        ? data.items
        : []
    return list
  }, [data])

  const fetchApiProducts = async (pageArg = page) => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/trendyol/products?page=${encodeURIComponent(pageArg)}&size=${encodeURIComponent(size)}`
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'API error')
      } else {
        setData(json)
      }
    } catch (e: any) {
      setError(e?.message ?? 'unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getKey = (p: any): string => String(p?.id ?? p?.productId ?? p?.productMainId ?? '')
  const isSelected = (p: any) => selectedIds.includes(getKey(p))
  const toggleSelect = (p: any, checked: boolean | string) => {
    const key = getKey(p)
    const nextChecked = checked === 'indeterminate' ? true : Boolean(checked)
    setSelectedIds((prev) => {
      const set = new Set(prev)
      if (nextChecked) set.add(key)
      else set.delete(key)
      return Array.from(set)
    })
  }
  const selectAllOnPage = () => {
    const keys = products.map(getKey).filter(Boolean)
    setSelectedIds(keys)
  }
  const clearSelection = () => setSelectedIds([])

  const fetchTrendyolPageRaw = async (pageIndex: number) => {
    const url = `/api/trendyol/products?page=${encodeURIComponent(pageIndex)}&size=${encodeURIComponent(size)}`
    const res = await fetch(url)
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || 'API error')
    return json
  }

  const extractProducts = (json: any) => {
    const list = Array.isArray(json?.content)
      ? json.content
      : Array.isArray(json?.items)
        ? json.items
        : []
    return list
  }

  const startUpload = async () => {
    const r = parseFloat(ratio)
    if (!isFinite(r) || r <= 0) {
      alert('Geçerli bir oran giriniz (ör. 1.2)')
      return
    }
    try {
      setUploading(true)
      const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : 1
      setUploadStats({ current: 0, total: totalPages, created: 0, updated: 0, processed: 0 })

      for (let i = 0; i < totalPages; i++) {
        // Sayfayı görsel olarak ilerlet
        setPage(i)
        // İlgili sayfa verisini çek
        const json = await fetchTrendyolPageRaw(i)
        const items = extractProducts(json)
        if (!items?.length) {
          setUploadStats((s) => ({ ...s, current: i + 1 }))
          continue
        }
        const res = await fetch('/api/admin/products/import-trendyol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: items, ratio: r })
        })
        const out = await res.json()
        const created = out?.created ?? 0
        const updated = out?.updated ?? 0
        setUploadStats((s) => ({
          current: i + 1,
          total: totalPages,
          created: s.created + created,
          updated: s.updated + updated,
          processed: s.processed + (items?.length ?? 0)
        }))
      }
    } catch (e: any) {
      alert(e?.message ?? 'Yükleme sırasında hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    fetchApiProducts(page)
  }, [page])

  const formatTRY = (value: number) =>
    formatCurrency(value ?? 0, 'TRY', 'tr-TR')

  const formatDescriptionText = (text: any) => {
    if (!text) return ''
    try {
      const s = String(text)
      // Noktalı virgülleri iki satır başına çevir
      return s.replace(/;\s*/g, '\n\n')
    } catch {
      return ''
    }
  }

  const downloadJson = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const a = document.createElement('a')
    a.href = url
    a.download = `trendyol-products-${ts}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const placeholder = '/images/placeholder.jpg'

  return (
    <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-6'>
      <h1 className="text-2xl font-bold mb-4">Trendyol&apos;dan Ürün Yükleme Aracı</h1>

      <div className='flex items-center gap-3 mb-4'>
        <Button variant='outline' onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0 || loading}>
          Önceki
        </Button>
        <Button variant='outline' onClick={() => setPage((p) => p + 1)} disabled={loading || (typeof data?.totalPages === 'number' ? page + 1 >= data.totalPages : false)}>
          Sonraki
        </Button>
        <div className='text-sm text-muted-foreground'>
          Sayfa {page + 1}
          {typeof data?.totalPages === 'number' ? ` / ${data.totalPages}` : ''}
        </div>
        <div className='ml-auto flex gap-2'>
          <Button onClick={() => fetchApiProducts()} disabled={loading}>
            {loading ? 'Yükleniyor...' : 'Yenile'}
          </Button>
          {data && (
            <Button variant='outline' onClick={downloadJson}>
              JSON&apos;u indir
            </Button>
          )}
          <Button variant='outline' onClick={selectAllOnPage} disabled={loading || products.length === 0}>
            Sayfayı Seç
          </Button>
          <Button variant='outline' onClick={clearSelection} disabled={loading || selectedIds.length === 0}>
            Seçimleri Temizle
          </Button>
          <Button variant='default' onClick={() => setUploadSelectedOpen(true)} disabled={uploading || selectedIds.length === 0}>
            Seçilenleri Yükle
          </Button>
          <Button variant='default' onClick={() => setUploadOpen(true)} disabled={uploading}>
            Ürünleri Sisteme Yükle
          </Button>
          <Button variant='destructive' onClick={() => setUpdateImagesOpen(true)} disabled={uploading}>
            Resimleri Güncelle
          </Button>
          <Button variant='destructive' onClick={() => setUpdateAllImagesOpen(true)} disabled={uploading}>
            Tüm Resimleri Güncelle
          </Button>
        </div>
      </div>


      {error && <div className='mt-2 text-red-600 text-sm'>Hata: {error}</div>}

      {products.length > 0 ? (
        <>
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
            {products.map((p: any) => {
              const img = p?.images?.[0]?.url || placeholder
              return (
                <div
                  key={p?.id ?? p?.productId ?? p?.productMainId}
                  className='relative text-left border rounded overflow-hidden hover:shadow-sm transition'
                  onClick={() => setSelected(p)}
                >
                  <div className='absolute top-2 left-2 z-10 bg-background/80 rounded p-1' onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected(p)}
                      onCheckedChange={(v) => toggleSelect(p, v as any)}
                      aria-label='Select product'
                    />
                  </div>
                  <div className='aspect-square bg-muted'>
                    <img
                      src={img}
                      alt={p?.title ?? p?.name ?? 'Ürün'}
                      className='w-full h-full object-cover'
                    />
                  </div>
                  <div className='p-2'>
                    <div className='text-xs text-muted-foreground'>{p?.brand ?? p?.brandName ?? '-'}</div>
                    <div className='text-sm font-medium line-clamp-2'>{p?.title ?? p?.name ?? '-'}</div>
                    <div className='mt-1 text-sm'>{typeof p?.salePrice === 'number' ? formatTRY(p.salePrice) : '-'}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className='mt-4 text-xs text-muted-foreground'>
            Toplam: {products.length} ürün. Seçili: {selectedIds.length}. Sayfadan detay görmek için karta tıklayın.
          </div>
        </>
      ) : (
        <div className='text-sm text-muted-foreground'>Veri yok. “Veriyi Yenile” ile yeniden dene.</div>
      )}

      {selected && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4' onClick={() => setSelected(null)}>
          <div
            className='bg-white dark:bg-neutral-900 w-full max-w-3xl rounded shadow-lg overflow-auto max-h-[85vh]'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between border-b p-3'>
              <div>
                <div className='text-xs text-muted-foreground'>{selected?.brand ?? selected?.brandName ?? '-'}</div>
                <div className='text-lg font-semibold'>{selected?.title ?? selected?.name ?? '-'}</div>
              </div>
              <Button variant='ghost' onClick={() => setSelected(null)}>Kapat</Button>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4'>
              <div>
                <div className='aspect-square bg-muted rounded'>
                  <img
                    src={selected?.images?.[0]?.url || placeholder}
                    alt={selected?.title ?? selected?.name ?? 'Ürün'}
                    className='w-full h-full object-cover rounded'
                  />
                </div>
                <div className='mt-2 text-sm'>
                  <div>Barkod: <span className='text-muted-foreground'>{selected?.barcode ?? '-'}</span></div>
                  <div>Stok: <span className='text-muted-foreground'>{selected?.quantity ?? '-'}</span></div>
                  <div>Fiyat: <span className='text-muted-foreground'>{typeof selected?.salePrice === 'number' ? formatTRY(selected.salePrice) : '-'}</span></div>
                  <div>KDV: <span className='text-muted-foreground'>{selected?.vatRate ?? '-'}</span></div>
                  <div>Kategori: <span className='text-muted-foreground'>{selected?.categoryName ?? '-'}</span></div>
                  <div>Onaylı: <span className='text-muted-foreground'>{typeof selected?.approved === 'boolean' ? (selected.approved ? 'Evet' : 'Hayır') : '-'}</span></div>
                  <div>Ürün URL: <a className='text-blue-600 underline' href={selected?.productUrl} target='_blank' rel='noreferrer'>{selected?.productUrl ? "Trendyol'da Aç" : '-'}</a></div>
                </div>
              </div>
              <div>
                <div className='text-sm font-medium mb-2'>Açıklama</div>
                <div className='text-sm whitespace-pre-wrap break-words'>
                  {formatDescriptionText(selected?.description) || 'Açıklama yok.'}
                </div>
                <div className='mt-3 text-sm font-medium'>Öznitelikler</div>
                <ul className='text-sm space-y-1'>
                  {(selected?.attributes ?? []).map((a: any, idx: number) => (
                    <li key={idx} className='flex justify-between gap-2'>
                      <span className='text-muted-foreground'>{a?.attributeName ?? a?.name ?? '-'}</span>
                      <span>{a?.attributeValue ?? a?.value ?? '-'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4' onClick={() => !uploading && setUploadOpen(false)}>
          <div
            className='bg-white dark:bg-neutral-900 w-full max-w-lg rounded shadow-lg overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between border-b p-3'>
              <div className='text-lg font-semibold'>Ürünleri Sisteme Yükle</div>
              <Button variant='ghost' onClick={() => !uploading && setUploadOpen(false)}>Kapat</Button>
            </div>
            <div className='p-4 space-y-3'>
              <div className='text-sm text-muted-foreground'>
                Trendyol fiyatları TL kabul edilir. Sistem para birimine çevrilir ve girdiğiniz oran ile çarpılır.
              </div>
              <label className='text-sm font-medium'>Oran (ör. 1.2)</label>
              <input
                type='number'
                step='0.01'
                min='0'
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                className='w-full rounded border px-3 py-2 bg-transparent'
                disabled={uploading}
              />
              <div className='flex items-center justify-between mt-2'>
                <Button onClick={startUpload} disabled={uploading}>
                  {uploading ? 'Başlatılıyor...' : 'Başlat'}
                </Button>
                {uploading && (
                  <div className='flex items-center gap-2 text-sm'>
                    <span className='animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full' />
                    <span>Yükleniyor...</span>
                  </div>
                )}
              </div>
              <div className='mt-3 text-sm'>
                <div>İlerleme: Sayfa {uploadStats.current} / {uploadStats.total}</div>
                <div>İşlenen ürün: {uploadStats.processed}</div>
                <div>Oluşturulan: {uploadStats.created} • Güncellenen: {uploadStats.updated}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadSelectedOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4' onClick={() => !uploading && setUploadSelectedOpen(false)}>
          <div
            className='bg-white dark:bg-neutral-900 w-full max-w-lg rounded shadow-lg overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between border-b p-3'>
              <div className='text-lg font-semibold'>Seçilenleri Sisteme Yükle</div>
              <Button variant='ghost' onClick={() => !uploading && setUploadSelectedOpen(false)}>Kapat</Button>
            </div>
            <div className='p-4 space-y-3'>
              <div className='text-sm text-muted-foreground'>
                Trendyol fiyatları TL kabul edilir. Sistem para birimine çevrilir ve girdiğiniz oran ile çarpılır.
              </div>
              <div className='text-sm'>Seçili ürün sayısı: <span className='font-medium'>{selectedIds.length}</span></div>
              <label className='text-sm font-medium'>Oran (ör. 1.2)</label>
              <input
                type='number'
                step='0.01'
                min='0'
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                className='w-full rounded border px-3 py-2 bg-transparent'
                disabled={uploading}
              />
              <div className='flex items-center justify-between mt-2'>
                <Button onClick={async () => {
                  const r = parseFloat(ratio)
                  if (!isFinite(r) || r <= 0) {
                    alert('Geçerli bir oran giriniz (ör. 1.2)')
                    return
                  }
                  const selectedProducts = products.filter((p: any) => selectedIds.includes(getKey(p)))
                  if (selectedProducts.length === 0) {
                    alert('Yüklenecek ürün seçilmedi')
                    return
                  }
                  try {
                    setUploading(true)
                    const res = await fetch('/api/admin/products/import-trendyol', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ products: selectedProducts, ratio: r })
                    })
                    const out = await res.json()
                    const created = out?.created ?? 0
                    const updated = out?.updated ?? 0
                    setUploadStats({ current: 1, total: 1, created, updated, processed: selectedProducts.length })
                    alert(`İşlem tamamlandı: Oluşturulan ${created}, Güncellenen ${updated}`)
                    setUploadSelectedOpen(false)
                  } catch (e: any) {
                    alert(e?.message ?? 'Yükleme sırasında hata oluştu')
                  } finally {
                    setUploading(false)
                  }
                }} disabled={uploading}>
                  {uploading ? 'Yükleniyor...' : 'Başlat'}
                </Button>
                {uploading && (
                  <div className='flex items-center gap-2 text-sm'>
                    <span className='animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full' />
                    <span>Yükleniyor...</span>
                  </div>
                )}
              </div>
              <div className='mt-3 text-sm'>
                <div>İşlenen ürün: {uploadStats.processed}</div>
                <div>Oluşturulan: {uploadStats.created} • Güncellenen: {uploadStats.updated}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {updateImagesOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4' onClick={() => !uploading && setUpdateImagesOpen(false)}>
          <div
            className='bg-white dark:bg-neutral-900 w-full max-w-lg rounded shadow-lg overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between border-b p-3'>
              <div className='text-lg font-semibold'>Resimleri Güncelle</div>
              <Button variant='ghost' onClick={() => !uploading && setUpdateImagesOpen(false)}>Kapat</Button>
            </div>
            <div className='p-4 space-y-3'>
              <div className='text-sm text-muted-foreground'>
                Bu işlem, seçili ürünlerin resimlerini veritabanında günceller.
              </div>
              <div className='text-sm'>Seçili ürün sayısı: <span className='font-medium'>{selectedIds.length}</span></div>
              <div className='flex items-center justify-between mt-2'>
                <Button onClick={async () => {
                  const selectedProducts = products.filter((p: any) => selectedIds.includes(getKey(p)))
                  if (selectedProducts.length === 0) {
                    alert('Güncellenecek ürün seçilmedi')
                    return
                  }
                  try {
                    setUploading(true)
                    const res = await fetch('/api/admin/products/update-images', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ products: selectedProducts })
                    })
                    const out = await res.json()
                    const updated = out?.updated ?? 0
                    const skipped = out?.skipped ?? 0
                    alert(`İşlem tamamlandı: Güncellenen ${updated}, Atlanan ${skipped}`)
                    setUpdateImagesOpen(false)
                  } catch (e: any) {
                    alert(e?.message ?? 'Güncelleme sırasında hata oluştu')
                  } finally {
                    setUploading(false)
                  }
                }} disabled={uploading || selectedIds.length === 0}>
                  {uploading ? 'Güncelleniyor...' : 'Seçilenleri Güncelle'}
                </Button>
                {uploading && (
                  <div className='flex items-center gap-2 text-sm'>
                    <span className='animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full' />
                    <span>Güncelleniyor...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {updateAllImagesOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4' onClick={() => !uploading && setUpdateAllImagesOpen(false)}>
          <div
            className='bg-white dark:bg-neutral-900 w-full max-w-lg rounded shadow-lg overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between border-b p-3'>
              <div className='text-lg font-semibold'>Tüm Resimleri Güncelle</div>
              <Button variant='ghost' onClick={() => !uploading && setUpdateAllImagesOpen(false)}>Kapat</Button>
            </div>
            <div className='p-4 space-y-3'>
              <div className='text-sm text-muted-foreground'>
                Bu işlem, tüm ürünlerin resimlerini veritabanında günceller.
              </div>
              <div className='text-sm'>Toplam ürün sayısı: <span className='font-medium'>{data?.totalElements ?? 'Bilinmiyor'}</span></div>
              <div className='flex items-center justify-between mt-2'>
                <Button onClick={async () => {
                  try {
                    setUploading(true)
                    const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : 1
                    let allProducts: any[] = []

                    for (let i = 0; i < totalPages; i++) {
                      const json = await fetchTrendyolPageRaw(i)
                      const items = extractProducts(json)
                      if (items?.length) {
                        allProducts = allProducts.concat(items)
                      }
                    }

                    const res = await fetch('/api/admin/products/update-images', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ products: allProducts })
                    })
                    const out = await res.json()
                    const updated = out?.updated ?? 0
                    const skipped = out?.skipped ?? 0
                    alert(`İşlem tamamlandı: Güncellenen ${updated}, Atlanan ${skipped}`)
                    setUpdateAllImagesOpen(false)
                  } catch (e: any) {
                    alert(e?.message ?? 'Güncelleme sırasında hata oluştu')
                  } finally {
                    setUploading(false)
                  }
                }} disabled={uploading || products.length === 0}>
                  {uploading ? 'Güncelleniyor...' : 'Tümünü Güncelle'}
                </Button>
                {uploading && (
                  <div className='flex items-center gap-2 text-sm'>
                    <span className='animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full' />
                    <span>Güncelleniyor...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}