'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useLocale } from 'next-intl'
import { Loader2, Plus, Pencil, Trash } from 'lucide-react'

interface PromoTextItem {
  id: string
  sortOrder: number
  active: boolean
  text?: string
}

interface Translation {
  locale: string
  text: string
}

export default function PromoTextsPage() {
  const [items, setItems] = useState<PromoTextItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const locale = useLocale()

  const [editing, setEditing] = useState<PromoTextItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<PromoTextItem | null>(null)

  const fetchList = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (locale) params.set('locale', locale)
      const res = await fetch(`/api/admin/promo-texts?${params.toString()}`)
      const data = await res.json()
      setItems(data.promoTexts || [])
      setTotal(data.pagination?.total || 0)
    } catch (e) {
      console.error('Failed to fetch promo texts', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, locale])

  const pages = useMemo(() => Math.max(1, Math.ceil((total || 0) / limit)), [total, limit])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fırsat Yazıları</CardTitle>
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Yeni Ekle
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Input placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="text-sm text-muted-foreground ml-auto">Toplam: {total}</div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metin</TableHead>
                  <TableHead>Sıra</TableHead>
                  <TableHead>Aktif</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" /> Yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Kayıt bulunamadı</TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-xl truncate">{item.text || '-'}</TableCell>
                      <TableCell>{item.sortOrder}</TableCell>
                      <TableCell>{item.active ? 'Evet' : 'Hayır'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(item); setShowForm(true) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleting(item)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Önceki</Button>
            <div className="text-sm">Sayfa {page} / {pages}</div>
            <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Sonraki</Button>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <PromoTextForm
          id={editing?.id}
          initialSortOrder={editing?.sortOrder}
          initialActive={editing?.active}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchList() }}
        />
      )}

      {deleting && (
        <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Silme Onayı</AlertDialogTitle>
            </AlertDialogHeader>
            <p>Bu fırsat yazısı silinecek. Onaylıyor musunuz?</p>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setDeleting(null)}>İptal</Button>
              <Button variant="destructive" onClick={async () => {
                try {
                  await fetch('/api/admin/promo-texts', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: deleting?.id }),
                  })
                  setDeleting(null)
                  fetchList()
                } catch (e) {
                  console.error('Delete promo text failed', e)
                }
              }}>Sil</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

function PromoTextForm({ id, initialSortOrder, initialActive, onClose, onSaved }: {
  id?: string
  initialSortOrder?: number
  initialActive?: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [sortOrder, setSortOrder] = useState<number>(initialSortOrder ?? 0)
  const [active, setActive] = useState<boolean>(initialActive ?? true)
  const [trText, setTrText] = useState('')
  const [enText, setEnText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadTranslations = async () => {
      if (!id) return
      try {
        const res = await fetch(`/api/admin/promo-texts/${id}`)
        const data = await res.json()
        const translations: Translation[] = data.promoText?.translations || []
        setTrText(translations.find((t) => t.locale === 'tr')?.text || '')
        setEnText(translations.find((t) => t.locale === 'en')?.text || '')
      } catch (e) {
        console.error('Failed to load promo text', e)
      }
    }
    loadTranslations()
  }, [id])

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{id ? 'Fırsat Yazısını Düzenle' : 'Yeni Fırsat Yazısı'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sıra</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Aktif</Label>
            </div>
          </div>

          <div>
            <Label>Türkçe Metin (tr)</Label>
            <Textarea value={trText} onChange={(e) => setTrText(e.target.value)} placeholder="Örn: 1000 TL üzeri siparişlerde kargo bedava" />
          </div>

          <div>
            <Label>İngilizce Metin (en)</Label>
            <Textarea value={enText} onChange={(e) => setEnText(e.target.value)} placeholder="e.g., Free shipping over 1000 TL orders" />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>İptal</Button>
            <Button disabled={saving} onClick={async () => {
              setSaving(true)
              try {
                const payload = {
                  sortOrder,
                  active,
                  translations: [
                    { locale: 'tr', text: trText },
                    { locale: 'en', text: enText },
                  ],
                }
                const res = await fetch('/api/admin/promo-texts', {
                  method: id ? 'PATCH' : 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(id ? { id, ...payload } : payload),
                })
                if (!res.ok) throw new Error('Save failed')
                onSaved()
              } catch (e) {
                console.error('Save promo text failed', e)
              } finally {
                setSaving(false)
              }
            }}>{saving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Kaydediliyor</>) : 'Kaydet'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}