"use client"

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

type Translation = { locale: string; contentHtml: string | null }

export default function AdminAboutPage() {
  const locale = useLocale()
  const t = useTranslations('admin.navigation')
  const { toast } = useToast()

  const locales = useMemo(() => ['tr', 'en'], [])
  const [activeTab, setActiveTab] = useState(locale as string)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false }),
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setValues((prev) => ({ ...prev, [activeTab]: html }))
    },
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/about', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch')
        const data: { translations: Translation[] } = await res.json()
        const initial: Record<string, string> = {}
        locales.forEach((lc) => {
          const found = data.translations.find((x) => x.locale === lc)
          initial[lc] = found?.contentHtml || ''
        })
        setValues(initial)
      } catch (err) {
        console.error('About verisi alınamadı', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [locales])

  // Sekme değişince editöre seçilen locale içeriğini yükle
  useEffect(() => {
    const html = values[activeTab] || ''
    editor?.commands.setContent(html)
  }, [activeTab])

  // Editör hazır olduğunda veya içerik değiştiğinde senkronize et
  useEffect(() => {
    if (!editor) return
    const html = values[activeTab] || ''
    const current = editor.getHTML()
    if (html !== current) {
      editor.commands.setContent(html)
    }
  }, [editor, activeTab, values])

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload = {
        translations: locales.map((lc) => ({ locale: lc, contentHtml: values[lc] || '' })),
      }
      const res = await fetch('/api/admin/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to update')
      toast({ title: locale === 'tr' ? 'Kaydedildi' : 'Saved' })
    } catch (err) {
      toast({ title: locale === 'tr' ? 'Hata' : 'Error', description: locale === 'tr' ? 'Güncelleme başarısız' : 'Update failed', variant: 'destructive' })
      console.error('Güncelleme başarısız', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('about', { defaultMessage: (locale === 'tr' ? 'Hakkımızda' : 'About') })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
            <TabsList>
              {locales.map((lc) => (
                <TabsTrigger key={lc} value={lc}>
                  {lc.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Toolbar */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleBold().run()} disabled={!editor || loading}>
              {locale === 'tr' ? 'Kalın' : 'Bold'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor || loading}>
              {locale === 'tr' ? 'İtalik' : 'Italic'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} disabled={!editor || loading}>
              H1
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} disabled={!editor || loading}>
              H2
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} disabled={!editor || loading}>
              H3
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={!editor || loading}>
              {locale === 'tr' ? 'Madde' : 'Bullet'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={!editor || loading}>
              {locale === 'tr' ? 'Sıralı' : 'Ordered'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const url = prompt(locale === 'tr' ? 'Bağlantı URL' : 'Link URL')
                if (!url) return
                editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
              }}
              disabled={!editor || loading}
            >
              {locale === 'tr' ? 'Bağlantı' : 'Link'}
            </Button>
          </div>

          {/* Editor */}
          <div className="mt-4 border rounded-md p-3">
            {editor && <EditorContent editor={editor} />}
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Kaydediliyor…' : (locale === 'tr' ? 'Kaydet' : 'Save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}