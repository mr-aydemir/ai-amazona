'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export default function AdminEtbisPage() {
  const locale = useLocale()
  const { toast } = useToast()
  const [etbisUrl, setEtbisUrl] = useState('')
  const [etbisQrImage, setEtbisQrImage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/etbis')
        if (!res.ok) return
        const json = await res.json()
        if (typeof json?.etbisUrl === 'string') setEtbisUrl(json.etbisUrl)
        if (typeof json?.etbisQrImage === 'string') setEtbisQrImage(json.etbisQrImage)
      } catch {
        // noop
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/etbis', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etbisUrl }),
      })
      if (!res.ok) throw new Error('save_failed')
      const json = await res.json()
      if (typeof json?.etbisUrl === 'string') setEtbisUrl(json.etbisUrl)
      if (typeof json?.etbisQrImage === 'string') setEtbisQrImage(json.etbisQrImage)
      toast({
        title: locale === 'tr' ? 'ETBİS linki kaydedildi, QR yeniden oluşturuldu.' : 'ETBİS link saved and QR regenerated.',
      })
    } catch {
      toast({ title: locale === 'tr' ? 'ETBİS ayarları kaydedilemedi' : 'Failed to save ETBİS settings' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='container mx-auto px-4 py-6'>
      <h1 className='text-2xl font-bold mb-4'>
        {locale === 'tr' ? 'ETBİS Yönetimi' : 'ETBİS Management'}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{locale === 'tr' ? 'ETBİS Kayıt Bağlantısı' : 'ETBİS Registration Link'}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label>{locale === 'tr' ? 'ETBİS linki' : 'ETBİS link'}</Label>
            <Input
              type='url'
              value={etbisUrl}
              onChange={(e) => setEtbisUrl(e.target.value)}
              placeholder='https://etbis.ticaret.gov.tr/tr/Home/SearchSiteResult?siteId=...'
              disabled={loading}
            />
            <p className='text-xs text-muted-foreground'>
              {locale === 'tr'
                ? 'Link değiştirilip kaydedildiğinde footerda görünen ETBİS QR görseli otomatik olarak yeniden üretilir.'
                : 'When the link is changed and saved, the ETBİS QR badge shown in the footer is regenerated automatically.'}
            </p>
          </div>

          <div className='space-y-2'>
            <Label>{locale === 'tr' ? 'Önizleme' : 'Preview'}</Label>
            {loading ? (
              <p className='text-sm text-muted-foreground'>{locale === 'tr' ? 'Yükleniyor...' : 'Loading...'}</p>
            ) : etbisQrImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={etbisQrImage}
                alt='ETBİS QR'
                className='h-64 w-auto rounded border bg-white p-2'
              />
            ) : (
              <p className='text-sm text-muted-foreground'>
                {locale === 'tr' ? 'Henüz QR görseli oluşturulmadı.' : 'No QR image generated yet.'}
              </p>
            )}
          </div>

          <div className='flex gap-2'>
            <Button onClick={save} disabled={saving || loading || !etbisUrl.trim()}>
              {saving
                ? (locale === 'tr' ? 'Oluşturuluyor...' : 'Generating...')
                : (locale === 'tr' ? 'Kaydet ve QR Oluştur' : 'Save and Generate QR')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
