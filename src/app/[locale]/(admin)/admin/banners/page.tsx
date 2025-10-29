'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import Image from 'next/image'
import { Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { UploadDropzone } from '@/lib/uploadthing'

type BannerListItem = {
  id: string
  image: string
  linkUrl?: string | null
  sortOrder: number
  active: boolean
  title?: string | null
  description?: string | null
}

export default function AdminBannersPage() {
  const t = useTranslations('admin.banners')
  const locale = useLocale()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [banners, setBanners] = useState<BannerListItem[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState<null | BannerListItem>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchBanners = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        locale: String(locale),
      })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/banners?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      setBanners(Array.isArray(data?.banners) ? data.banners : [])
      setTotal(Number(data?.pagination?.total || 0))
    } catch (e) {
      toast.error(t('toast.load_error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, locale])

  const resetAndRefresh = () => {
    setPage(1)
    fetchBanners()
  }

  const handleCreate = async (payload: any) => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('toast.create_success'))
      setOpenCreate(false)
      resetAndRefresh()
    } catch {
      toast.error(t('toast.create_error'))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string, payload: any) => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/banners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('toast.update_success'))
      setOpenEdit(null)
      resetAndRefresh()
    } catch {
      toast.error(t('toast.update_error'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/banners', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('toast.delete_success'))
      setDeleteId(null)
      resetAndRefresh()
    } catch {
      toast.error(t('toast.delete_error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>{t('title')}</h1>
          <p className='text-muted-foreground'>{t('description')}</p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className='mr-2 h-4 w-4' /> {t('add_button')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>{t('list_title')}</span>
            <div className='flex gap-2'>
              <div className='relative w-64'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder={t('search_placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='pl-8'
                />
              </div>
              <Button variant='outline' onClick={resetAndRefresh}>{t('actions.refresh')}</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.image')}</TableHead>
                  <TableHead>{t('table.title')}</TableHead>
                  <TableHead>{t('table.description')}</TableHead>
                  <TableHead>{t('table.link')}</TableHead>
                  <TableHead>{t('table.order')}</TableHead>
                  <TableHead>{t('table.active')}</TableHead>
                  <TableHead>{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className='text-center py-8'>
                      <div className='flex items-center justify-center gap-2 text-muted-foreground'>
                        <Loader2 className='h-4 w-4 animate-spin' /> {t('loading')}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : banners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='text-center py-8'>
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  banners.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        {b.image && (
                          <Image src={b.image} alt={b.title || ''} width={80} height={40} className='rounded object-cover' />
                        )}
                      </TableCell>
                      <TableCell className='font-medium'>{b.title || '-'}</TableCell>
                      <TableCell className='text-muted-foreground'>{b.description || '-'}</TableCell>
                      <TableCell className='text-sm'>{b.linkUrl || '-'}</TableCell>
                      <TableCell>{b.sortOrder}</TableCell>
                      <TableCell>{b.active ? t('active_yes') : t('active_no')}</TableCell>
                      <TableCell>
                        <div className='flex gap-2'>
                          <Button size='sm' variant='outline' onClick={() => setOpenEdit(b)}>
                            <Edit className='mr-2 h-4 w-4' /> {t('edit')}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size='sm' variant='destructive' onClick={() => setDeleteId(b.id)}>
                                <Trash2 className='mr-2 h-4 w-4' /> {t('delete')}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('confirm_delete.title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('confirm_delete.description')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteId(null)}>{t('confirm_delete.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>{t('confirm_delete.confirm')}</AlertDialogAction>
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

      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className='sm:max-w-[700px] max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{t('create_dialog.title')}</DialogTitle>
            <DialogDescription>{t('create_dialog.description')}</DialogDescription>
          </DialogHeader>
          <BannerForm
            onSubmit={(payload) => handleCreate(payload)}
            onCancel={() => setOpenCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!openEdit} onOpenChange={(v) => !v && setOpenEdit(null)}>
        <DialogContent className='sm:max-w-[700px] max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{t('edit_dialog.title')}</DialogTitle>
            <DialogDescription>{t('edit_dialog.description')}</DialogDescription>
          </DialogHeader>
          {openEdit && (
            <BannerForm
              initial={openEdit}
              onSubmit={(payload) => handleUpdate(openEdit.id, payload)}
              onCancel={() => setOpenEdit(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BannerForm({ initial, onSubmit, onCancel }: {
  initial?: BannerListItem
  onSubmit: (payload: any) => void
  onCancel: () => void
}) {
  const t = useTranslations('admin.banners')
  const [image, setImage] = useState(initial?.image || '/images/banner1.jpg')
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl || '')
  const [sortOrder, setSortOrder] = useState<number>(initial?.sortOrder ?? 0)
  const [active, setActive] = useState<boolean>(initial?.active ?? true)

  const [trTitle, setTrTitle] = useState(initial?.title || '')
  const [trDescription, setTrDescription] = useState(initial?.description || '')
  const [enTitle, setEnTitle] = useState('')
  const [enDescription, setEnDescription] = useState('')

  useEffect(() => {
    // On edit, fetch full translations for TR/EN to prefill the form
    const loadTranslations = async () => {
      if (!initial?.id) {
        setTrTitle(initial?.title || '')
        setTrDescription(initial?.description || '')
        return
      }
      try {
        const res = await fetch(`/api/admin/banners/${initial.id}`, { cache: 'no-store' })
        const data = await res.json()
        const translations = Array.isArray(data?.banner?.translations) ? data.banner.translations : []
        const tr = translations.find((t: any) => t.locale === 'tr')
        const en = translations.find((t: any) => t.locale === 'en')
        setTrTitle((tr?.title ?? initial?.title) || '')
        setTrDescription((tr?.description ?? initial?.description) || '')
        setEnTitle(en?.title || '')
        setEnDescription(en?.description || '')
      } catch {
        // Fallback to initial values
        setTrTitle(initial?.title || '')
        setTrDescription(initial?.description || '')
      }
    }
    loadTranslations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id])

  const handleSubmit = () => {
    const translations = [
      { locale: 'tr', title: trTitle, description: trDescription },
      { locale: 'en', title: enTitle, description: enDescription },
    ].filter((t) => t.title || t.description)

    onSubmit({ image, linkUrl, sortOrder, active, translations })
  }

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <label className='text-sm font-medium'>{t('form.link_label')}</label>
          <Input value={linkUrl || ''} onChange={(e) => setLinkUrl(e.target.value)} />
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div>
          <label className='text-sm font-medium'>{t('form.order_label')}</label>
          <Input type='number' value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value || '0'))} />
        </div>
        <div className='flex items-center gap-2'>
          <input id='active' type='checkbox' checked={!!active} onChange={(e) => setActive(e.target.checked)} />
          <label htmlFor='active' className='text-sm'>{t('form.active_label')}</label>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div>
          <h4 className='font-medium'>{t('form.tr_section')}</h4>
          <label className='text-sm'>{t('form.title_label')}</label>
          <Input value={trTitle} onChange={(e) => setTrTitle(e.target.value)} />
          <label className='text-sm mt-2 block'>{t('form.description_label')}</label>
          <Input value={trDescription || ''} onChange={(e) => setTrDescription(e.target.value)} />
        </div>
        <div>
          <h4 className='font-medium'>{t('form.en_section')}</h4>
          <label className='text-sm'>{t('form.title_label')}</label>
          <Input value={enTitle} onChange={(e) => setEnTitle(e.target.value)} />
          <label className='text-sm mt-2 block'>{t('form.description_label')}</label>
          <Input value={enDescription} onChange={(e) => setEnDescription(e.target.value)} />
        </div>
      </div>

      {/* Image upload as the last input, spanning 2 columns */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='md:col-span-2'>
          <label className='text-sm font-medium'>{t('form.image_label')}</label>
          <Input placeholder='https://...' value={image} onChange={(e) => setImage(e.target.value)} />
          <div className='mt-3 border-2 border-dashed border-gray-300 rounded-lg p-4 max-h-[50vh] overflow-y-auto'>
            <UploadDropzone
              endpoint='imageUploader'
              onClientUploadComplete={(res) => {
                if (res && res.length > 0) {
                  const url = res[0].url
                  setImage(url)
                  toast.success(t('upload.success'))
                } else {
                  toast.error(t('upload.error'))
                }
              }}
              onUploadError={(error: Error) => {
                console.error('Upload error:', error)
                toast.error(t('upload.error_during'))
              }}
              config={{ mode: 'auto' }}
            />
            {image && (
              <div className='mt-4 flex items-center gap-3'>
                <Image src={image} alt={t('image.preview_alt')} width={160} height={80} className='rounded object-cover' />
                <span className='text-xs text-muted-foreground break-all'>{image}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='flex justify-end gap-2'>
        <Button variant='outline' onClick={onCancel}>{t('form.cancel')}</Button>
        <Button onClick={handleSubmit}>{t('form.save')}</Button>
      </div>
    </div>
  )
}