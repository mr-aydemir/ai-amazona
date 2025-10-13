'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { UploadDropzone } from '@/lib/uploadthing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, RefreshCw, Upload, Copy } from 'lucide-react'
import Image from 'next/image'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Pagination } from '@/components/ui/pagination'

interface UploadedFileItem {
  key: string
  name?: string
  size?: number
  uploadedAt?: string
  url?: string
}

export default function AdminUploadsPage() {
  const t = useTranslations('admin.uploads')
  const locale = useLocale()
  const [files, setFiles] = useState<UploadedFileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const startIndex = (page - 1) * limit + 1
  const endIndex = (page - 1) * limit + files.length

  const fetchFiles = async (pageParam = page, searchParam = search) => {
    try {
      setLoading(true)
      const qs = new URLSearchParams({
        page: String(pageParam),
        limit: String(limit),
        search: searchParam || '',
      })
      const res = await fetch(`/api/admin/uploads?${qs.toString()}`)
      const data = await res.json()
      setFiles(data.files || [])
      const p = data.pagination || { total: 0, pages: 1, page: pageParam }
      setTotal(p.total || 0)
      setPages(p.pages || 1)
      setPage(p.page || pageParam)
    } catch (err) {
      console.error('Failed to fetch uploads', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles(1, search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchFiles(1, search)
      setSelected(new Set())
    }, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const deleteFile = async (key: string) => {
    try {
      setDeleting(true)
      const res = await fetch('/api/admin/uploads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await res.json()
      if (data.success) {
        setFiles((prev) => prev.filter((f) => f.key !== key))
        setTotal((prev) => Math.max(prev - 1, 0))
        const nextSelected = new Set(selected)
        nextSelected.delete(key)
        setSelected(nextSelected)
      }
    } catch (err) {
      console.error('Failed to delete file', err)
    } finally {
      setDeleting(false)
    }
  }

  const deleteSelectedFiles = async () => {
    if (!selected.size) return
    try {
      setDeleting(true)
      const keys = Array.from(selected)
      const res = await fetch('/api/admin/uploads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      })
      const data = await res.json()
      if (data.success) {
        setFiles((prev) => prev.filter((f) => !selected.has(f.key)))
        setTotal((prev) => Math.max(prev - keys.length, 0))
        setSelected(new Set())
        fetchFiles(page, search)
      }
    } catch (err) {
      console.error('Failed to delete selected files', err)
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelect = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const allVisibleSelected = useMemo(() => {
    if (!files.length) return false
    return files.every((f) => selected.has(f.key))
  }, [files, selected])

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) {
        files.forEach((f) => next.add(f.key))
      } else {
        files.forEach((f) => next.delete(f.key))
      }
      return next
    })
  }

  const copyToClipboard = async (text?: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{t('title', { defaultMessage: 'Yüklenen Görseller' })}</h1>
        <Button variant="outline" size="sm" onClick={() => fetchFiles(page, search)} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh', { defaultMessage: 'Yenile' })}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('upload_new', { defaultMessage: 'Yeni Görsel Yükle' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDropzone
            className="border rounded-md p-2"
            endpoint="imageUploader"
            onClientUploadComplete={(res) => {
              const url = res?.[0]?.url
              const name = res?.[0]?.name
              // URL yoksa key üzerinden oluşturmayı dene (utfs.io)
              const key = (res as any)?.[0]?.key
              const finalUrl = url || (key ? `https://utfs.io/f/${key}` : undefined)
              if (finalUrl) {
                fetchFiles(1, search)
              }
            }}
            onUploadError={(error: Error) => {
              console.error('Upload error', error)
            }}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="search">{t('search', { defaultMessage: 'Ara' })}</Label>
          <Input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search_placeholder', { defaultMessage: 'İsim veya anahtar...' })} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={(checked) => toggleSelectAllVisible(Boolean(checked))}
            />
            <span className="text-sm">{t('select_all', { defaultMessage: 'Tümünü Seç' })}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {t('selected_count', { count: selected.size, defaultMessage: '{count} seçili' })}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={!selected.size || deleting}>
                <Trash2 className="h-4 w-4 mr-1" />
                {t('delete_selected', { defaultMessage: 'Seçileni Sil' })}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('confirm_title', { defaultMessage: 'Silme Onayı' })}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('confirm_description_bulk', {
                    defaultMessage:
                      'Seçili dosyaları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>{t('cancel', { defaultMessage: 'İptal' })}</AlertDialogCancel>
                <AlertDialogAction onClick={deleteSelectedFiles} disabled={deleting}>
                  {t('confirm', { defaultMessage: 'Sil' })}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {files.map((file) => (
          <Card key={file.key}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-4">
                <div className="relative w-24 h-24 bg-muted overflow-hidden rounded">
                  {file.url ? (
                    <Image src={file.url} alt={file.name || file.key} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">No Preview</div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.has(file.key)}
                      onCheckedChange={(checked) => toggleSelect(file.key, Boolean(checked))}
                    />
                    <div className="font-medium truncate">{file.name || t('unnamed', { defaultMessage: 'İsimsiz' })}</div>
                  </div>
                  <div className="text-xs text-muted-foreground break-all">{file.key}</div>
                  {file.size ? (
                    <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                  ) : null}
                  {file.uploadedAt ? (
                    <div className="text-xs text-muted-foreground">{new Date(file.uploadedAt).toLocaleString(locale)}</div>
                  ) : null}
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="secondary" size="sm" onClick={() => copyToClipboard(file.url)}>
                      <Copy className="h-4 w-4 mr-1" />
                      {t('copy_url', { defaultMessage: 'URL Kopyala' })}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={deleting}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t('delete', { defaultMessage: 'Sil' })}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('confirm_title', { defaultMessage: 'Silme Onayı' })}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('confirm_description_single', {
                              defaultMessage:
                                'Bu dosyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deleting}>{t('cancel', { defaultMessage: 'İptal' })}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteFile(file.key)} disabled={deleting}>
                            {t('confirm', { defaultMessage: 'Sil' })}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!files.length && (
          <div className="text-sm text-muted-foreground">
            {t('no_files', { defaultMessage: 'Henüz yüklenmiş görsel yok.' })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('pagination_showing', {
            start: startIndex,
            end: endIndex,
            total,
            defaultMessage: 'Toplam {total} dosyadan {start}-{end} arası gösteriliyor',
          })}
        </div>
        <Pagination
          currentPage={page}
          totalPages={pages}
          onPageChange={(p) => {
            setPage(p)
            fetchFiles(p, search)
            setSelected(new Set())
          }}
        />
      </div>
    </div>
  )
}