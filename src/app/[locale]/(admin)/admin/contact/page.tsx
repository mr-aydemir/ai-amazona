'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Translation = { locale: string; address?: string }
type Contact = {
  id?: string
  companyName?: string
  phone?: string
  email?: string
  iban?: string
  taxNumber?: string
  mernisNumber?: string
  mapEmbed?: string
  translations?: Translation[]
}

const SUPPORTED_LOCALES = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
]

export default function AdminContactPage() {
  const t = useTranslations('admin.contact')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [contact, setContact] = useState<Contact>({ translations: SUPPORTED_LOCALES.map(l => ({ locale: l.code, address: '' })) })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/contact')
        const data = await res.json()
        const c = data.contact || {}
        const translations = SUPPORTED_LOCALES.map(l => {
          const found = (c.translations || []).find((t: any) => t.locale === l.code)
          return { locale: l.code, address: found?.address || '' }
        })
        setContact({ ...c, translations })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const save = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Save failed')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const setField = (field: keyof Contact, value: string) => setContact(prev => ({ ...prev, [field]: value }))
  const setAddress = (loc: string, value: string) => setContact(prev => ({
    ...prev,
    translations: (prev.translations || []).map(t => t.locale === loc ? { ...t, address: value } : t)
  }))

  return (
    <div className='container mx-auto px-4 py-6'>
      <h1 className='text-2xl font-bold mb-4'>{t('title', { defaultMessage: 'İletişim Bilgileri' })}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('basic_info', { defaultMessage: 'Temel Bilgiler' })}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='md:col-span-2'>
              <Label>Firma Adı</Label>
              <Input value={contact.companyName || ''} onChange={e => setField('companyName', e.target.value)} placeholder='Hivhestın' />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input value={contact.phone || ''} onChange={e => setField('phone', e.target.value)} placeholder='+90 ...' />
            </div>
            <div>
              <Label>E-posta</Label>
              <Input value={contact.email || ''} onChange={e => setField('email', e.target.value)} placeholder='info@example.com' />
            </div>
            <div>
              <Label>IBAN</Label>
              <Input value={contact.iban || ''} onChange={e => setField('iban', e.target.value)} placeholder='TR..' />
            </div>
            <div>
              <Label>Vergi No</Label>
              <Input value={contact.taxNumber || ''} onChange={e => setField('taxNumber', e.target.value)} />
            </div>
            <div>
              <Label>MERNİS No</Label>
              <Input value={contact.mernisNumber || ''} onChange={e => setField('mernisNumber', e.target.value)} />
            </div>
            <div className='md:col-span-2'>
              <Label>Harita Embed (iframe URL)</Label>
              <Input value={contact.mapEmbed || ''} onChange={e => setField('mapEmbed', e.target.value)} placeholder='https://www.google.com/maps/embed?...' />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='mt-6'>
        <CardHeader>
          <CardTitle>Adres Çevirileri</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='tr' className='w-full'>
            <TabsList className='grid w-full grid-cols-2'>
              {SUPPORTED_LOCALES.map(l => (
                <TabsTrigger key={l.code} value={l.code}>
                  <span className='mr-2'>{l.flag}</span>{l.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {SUPPORTED_LOCALES.map(l => {
              const translation = (contact.translations || []).find(t => t.locale === l.code)
              return (
                <TabsContent key={l.code} value={l.code} className='space-y-4 mt-4'>
                  <div>
                    <Label>Adres ({l.name})</Label>
                    <Textarea rows={4} value={translation?.address || ''} onChange={e => setAddress(l.code, e.target.value)} />
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>

      <div className='flex justify-end gap-4 mt-6'>
        <Button variant='outline' onClick={() => window.location.assign(`/${locale}/admin`)}>
          Geri
        </Button>
        <Button onClick={save} disabled={loading}>
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </div>
  )
}