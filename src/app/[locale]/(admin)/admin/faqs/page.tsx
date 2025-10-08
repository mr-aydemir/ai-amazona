'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Edit, Trash2, Search, Loader2, Languages } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type FAQItem = {
  id: string
  sortOrder: number
  active: boolean
  question: string
  answer: string
}

export default function AdminFaqsPage() {
  const t = useTranslations('admin')
  const locale = useLocale()

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<FAQItem[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState<null | FAQItem>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const paramsBuilder = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      locale: String(locale),
    })
    if (search) params.set('search', search)
    return params
  }, [page, limit, locale, search])

  const fetchFaqs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/faqs?${paramsBuilder.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total || 0))
    } catch (e) {
      toast.error('SSS kayıtları yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFaqs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, locale])

  const resetAndRefresh = () => {
    setPage(1)
    fetchFaqs()
  }

  const handleCreate = async (payload: any) => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('SSS kaydı oluşturuldu')
      setOpenCreate(false)
      resetAndRefresh()
    } catch {
      toast.error('SSS kaydı oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string, payload: any) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/faqs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('SSS kaydı güncellendi')
      setOpenEdit(null)
      resetAndRefresh()
    } catch {
      toast.error('SSS kaydı güncellenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/faqs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success('SSS kaydı silindi')
      setDeleteId(null)
      resetAndRefresh()
    } catch {
      toast.error('SSS kaydı silinemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Sıkça Sorulan Sorular</h1>
          <p className='text-muted-foreground'>SSS kayıtlarını yönetin</p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className='mr-2 h-4 w-4' /> Soru Ekle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>SSS Listesi</span>
            <div className='flex gap-2'>
              <div className='relative w-64'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Soru/Cevap ile ara...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='pl-8'
                />
              </div>
              <Button variant='outline' onClick={resetAndRefresh}>Yenile</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Soru</TableHead>
                  <TableHead>Sıra</TableHead>
                  <TableHead>Aktif</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className='text-center py-8'>
                      <div className='flex items-center justify-center gap-2 text-muted-foreground'>
                        <Loader2 className='h-4 w-4 animate-spin' /> Yükleniyor
                      </div>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='text-center py-8'>
                      Kayıt bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className='font-medium'>{f.question || '-'}</TableCell>
                      <TableCell>{f.sortOrder}</TableCell>
                      <TableCell>{f.active ? 'Evet' : 'Hayır'}</TableCell>
                      <TableCell>
                        <div className='flex gap-2'>
                          <Button size='sm' variant='outline' onClick={() => setOpenEdit(f)}>
                            <Edit className='mr-2 h-4 w-4' /> Düzenle
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size='sm' variant='destructive' onClick={() => setDeleteId(f.id)}>
                                <Trash2 className='mr-2 h-4 w-4' /> Sil
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Kaydı sil?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu işlem geri alınamaz.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteId(null)}>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>Sil</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Yeni Soru</DialogTitle>
          </DialogHeader>
          <FaqForm
            mode='create'
            initial={{
              sortOrder: 0,
              active: true,
              translations: [
                { locale: 'tr', question: '', answer: '' },
                { locale: 'en', question: '', answer: '' },
              ],
            }}
            onSubmit={(payload) => handleCreate(payload)}
            onCancel={() => setOpenCreate(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!openEdit} onOpenChange={(v) => !v && setOpenEdit(null)}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>SSS Düzenle</DialogTitle>
          </DialogHeader>
          {openEdit && (
            <FaqForm
              mode='edit'
              initial={{
                id: openEdit.id,
                sortOrder: openEdit.sortOrder,
                active: openEdit.active,
                translations: [
                  { locale: 'tr', question: '', answer: '' },
                  { locale: 'en', question: '', answer: '' },
                ],
              }}
              onSubmit={(payload) => handleUpdate(openEdit.id, payload)}
              onCancel={() => setOpenEdit(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FaqForm({ initial, onSubmit, onCancel, mode }: {
  initial?: { id?: string; sortOrder: number; active: boolean; translations: { locale: string; question: string; answer: string }[] }
  onSubmit: (payload: any) => void
  onCancel: () => void
  mode?: 'create' | 'edit'
}) {
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)
  const [active, setActive] = useState(initial?.active ?? true)
  const [activeTab, setActiveTab] = useState('tr')
  const [translations, setTranslations] = useState(initial?.translations || [
    { locale: 'tr', question: '', answer: '' },
    { locale: 'en', question: '', answer: '' },
  ])

  useEffect(() => {
    const loadTranslations = async () => {
      if (mode !== 'edit' || !initial?.id) return
      try {
        const res = await fetch(`/api/admin/faqs/${initial.id}`)
        const data = await res.json()
        const tr = (data?.faq?.translations || []).find((t: any) => t.locale === 'tr')
        const en = (data?.faq?.translations || []).find((t: any) => t.locale === 'en')
        setTranslations([
          { locale: 'tr', question: tr?.question || '', answer: tr?.answer || '' },
          { locale: 'en', question: en?.question || '', answer: en?.answer || '' },
        ])
        setSortOrder(data?.faq?.sortOrder ?? initial.sortOrder)
        setActive(data?.faq?.active ?? initial.active)
      } catch {
        // ignore
      }
    }
    loadTranslations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id, mode])

  const updateField = (lc: string, field: 'question' | 'answer', value: string) => {
    setTranslations((prev) => prev.map((t) => t.locale === lc ? { ...t, [field]: value } : t))
  }

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <label className='text-sm font-medium'>Sıra</label>
          <Input type='number' value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>
        <div className='flex items-center gap-2'>
          <input id='active' type='checkbox' checked={active} onChange={(e) => setActive(e.target.checked)} />
          <label htmlFor='active'>Aktif</label>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='tr'>
            <Languages className='h-4 w-4 mr-2' /> Türkçe
          </TabsTrigger>
          <TabsTrigger value='en'>
            <Languages className='h-4 w-4 mr-2' /> English
          </TabsTrigger>
        </TabsList>

        <TabsContent value='tr' className='space-y-3'>
          <div>
            <label className='text-sm font-medium'>Soru (TR)</label>
            <Input value={translations.find(t => t.locale === 'tr')?.question || ''} onChange={(e) => updateField('tr', 'question', e.target.value)} />
          </div>
          <div>
            <label className='text-sm font-medium'>Cevap (TR)</label>
            <Textarea rows={6} value={translations.find(t => t.locale === 'tr')?.answer || ''} onChange={(e) => updateField('tr', 'answer', e.target.value)} />
          </div>
        </TabsContent>

        <TabsContent value='en' className='space-y-3'>
          <div>
            <label className='text-sm font-medium'>Question (EN)</label>
            <Input value={translations.find(t => t.locale === 'en')?.question || ''} onChange={(e) => updateField('en', 'question', e.target.value)} />
          </div>
          <div>
            <label className='text-sm font-medium'>Answer (EN)</label>
            <Textarea rows={6} value={translations.find(t => t.locale === 'en')?.answer || ''} onChange={(e) => updateField('en', 'answer', e.target.value)} />
          </div>
        </TabsContent>
      </Tabs>

      <div className='flex justify-end gap-2'>
        <Button variant='outline' onClick={onCancel}>İptal</Button>
        <Button onClick={() => onSubmit({ sortOrder, active, translations })}>Kaydet</Button>
      </div>
    </div>
  )
}