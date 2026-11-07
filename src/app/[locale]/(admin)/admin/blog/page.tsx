'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { generateBlogDraftClient } from '@/lib/ai-blog-client'

type LocaleKey = 'tr' | 'en'

type TranslationRow = {
  locale: string
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  metaTitle: string | null
  metaDescription: string | null
}

type BlogPostRow = {
  id: string
  slug: string
  coverImage: string | null
  author: string
  published: boolean
  publishedAt: string | null
  createdAt: string
  translations: TranslationRow[]
}

type TranslationForm = {
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  metaTitle: string
  metaDescription: string
}

type QualityCheck = {
  id: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

type QualityResult = {
  score: number
  level: 'pass' | 'warn' | 'fail'
  wordCount: number
  checks: QualityCheck[]
}

type PostForm = {
  id: string | null
  slug: string
  coverImage: string
  author: string
  published: boolean
  publishedAt: string
  translations: Record<LocaleKey, TranslationForm>
}

function emptyTranslation(): TranslationForm {
  return { title: '', slug: '', excerpt: '', contentHtml: '', metaTitle: '', metaDescription: '' }
}

function emptyForm(): PostForm {
  return {
    id: null,
    slug: '',
    coverImage: '',
    author: 'Hivhestın',
    published: false,
    publishedAt: '',
    translations: { tr: emptyTranslation(), en: emptyTranslation() },
  }
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromRow(post: BlogPostRow): PostForm {
  const translations = { tr: emptyTranslation(), en: emptyTranslation() }
  for (const row of post.translations) {
    if (row.locale !== 'tr' && row.locale !== 'en') continue
    translations[row.locale] = {
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      contentHtml: row.contentHtml,
      metaTitle: row.metaTitle || '',
      metaDescription: row.metaDescription || '',
    }
  }
  return {
    id: post.id,
    slug: post.slug,
    coverImage: post.coverImage || '',
    author: post.author,
    published: post.published,
    publishedAt: toDatetimeLocal(post.publishedAt),
    translations,
  }
}

export default function AdminBlogPage() {
  const locale = useLocale()
  const [posts, setPosts] = useState<BlogPostRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<PostForm>(emptyForm())
  const [formOpen, setFormOpen] = useState(false)
  const [activeLocale, setActiveLocale] = useState<LocaleKey>('tr')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiTopic, setAiTopic] = useState('')
  const [aiKeywords, setAiKeywords] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiWarning, setAiWarning] = useState<string | null>(null)
  const [quality, setQuality] = useState<QualityResult | null>(null)
  const [qualityLocale, setQualityLocale] = useState<LocaleKey>('tr')
  const [checkingQuality, setCheckingQuality] = useState(false)
  const [openRouterKey, setOpenRouterKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/admin/blog?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Liste alınamadı')
      const data = await res.json()
      setPosts(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Liste alınamadı')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('openrouter_api_key')
      if (saved) setOpenRouterKey(saved)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const resetForm = () => {
    setForm(emptyForm())
    setActiveLocale('tr')
    setFormOpen(false)
    setMessage(null)
    setError(null)
    setQuality(null)
  }

  const runQualityCheck = async (localeKey: LocaleKey = activeLocale) => {
    const translation = form.translations[localeKey]
    if (!translation.title.trim() || !translation.contentHtml.trim()) {
      setError('Kalite kontrolü için başlık ve içerik gerekli')
      return
    }
    setCheckingQuality(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/blog/quality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id || undefined,
          locale: localeKey,
          title: translation.title,
          excerpt: translation.excerpt,
          contentHtml: translation.contentHtml,
          metaTitle: translation.metaTitle,
          metaDescription: translation.metaDescription,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Kalite kontrolü yapılamadı')
      }
      setQuality(data as QualityResult)
      setQualityLocale(localeKey)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kalite kontrolü yapılamadı')
    } finally {
      setCheckingQuality(false)
    }
  }

  const updateTranslation = (localeKey: LocaleKey, patch: Partial<TranslationForm>) => {
    setForm((prev) => ({
      ...prev,
      translations: { ...prev.translations, [localeKey]: { ...prev.translations[localeKey], ...patch } },
    }))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const payload = {
        slug: form.slug.trim(),
        coverImage: form.coverImage.trim() || null,
        author: form.author.trim(),
        published: form.published,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
        translations: (['tr', 'en'] as LocaleKey[])
          .map((loc) => ({ locale: loc, ...form.translations[loc] }))
          .filter((t) => t.title.trim() && t.slug.trim() && t.excerpt.trim() && t.contentHtml.trim()),
      }

      if (!payload.slug || !payload.author) throw new Error('Post slug ve yazar zorunludur')
      if (payload.translations.length === 0) throw new Error('En az bir dil için başlık, slug, özet ve içerik doldurulmalı')

      const res = await fetch(form.id ? `/api/admin/blog/${form.id}` : '/api/admin/blog', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const issues = Array.isArray(data?.issues) ? data.issues : []
        if (issues.length > 0) {
          const detail = issues
            .map((issue: any) => `${String(issue.locale).toUpperCase()} — ${issue.label}: ${issue.detail}`)
            .join(' | ')
          throw new Error(`Yayın kalite kontrolünden geçemedi. ${detail}`)
        }
        throw new Error(typeof data?.error === 'string' ? data.error : 'Kaydedilemedi')
      }

      setMessage(form.id ? 'Yazı güncellendi' : 'Yazı oluşturuldu')
      resetForm()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (post: BlogPostRow) => {
    if (!window.confirm('Bu yazıyı silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Silinemedi')
      setMessage('Yazı silindi')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  const generateDraft = async () => {
    const key = openRouterKey.trim()
    if (!key) {
      setError('OpenRouter API anahtarını girin.')
      return
    }
    if (aiTopic.trim().length < 5) {
      setError('Konu en az 5 karakter olmalıdır')
      return
    }

    setAiGenerating(true)
    setError(null)
    setMessage(null)
    setAiWarning(null)

    try {
      try {
        window.localStorage.setItem('openrouter_api_key', key)
      } catch {
        // localStorage unavailable
      }

      const input = {
        topic: aiTopic.trim(),
        keywords: aiKeywords.trim() || undefined,
      }

      const [trResult, enResult] = await Promise.allSettled([
        generateBlogDraftClient('tr', input, key),
        generateBlogDraftClient('en', input, key),
      ])

      if (trResult.status === 'rejected') {
        throw trResult.reason
      }

      const tr = trResult.value
      const warnings: string[] = []
      let en: Awaited<ReturnType<typeof generateBlogDraftClient>> | null = null

      if (enResult.status === 'fulfilled') {
        en = enResult.value
      } else {
        warnings.push(
          'İngilizce taslak üretilemedi; yazı yalnızca Türkçe olarak kaydedildi.'
        )
        console.error(enResult.reason)
      }

      const translations = [
        {
          locale: 'tr',
          title: tr.title,
          slug: tr.slug,
          excerpt: tr.excerpt,
          contentHtml: tr.contentHtml,
          metaTitle: tr.metaTitle,
          metaDescription: tr.metaDescription,
        },
        ...(en
          ? [{
              locale: 'en',
              title: en.title,
              slug: en.slug,
              excerpt: en.excerpt,
              contentHtml: en.contentHtml,
              metaTitle: en.metaTitle,
              metaDescription: en.metaDescription,
            }]
          : []),
      ]

      // Only the lightweight save call reaches the server; the AI requests
      // above go directly from the browser to OpenRouter.
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: tr.slug,
          coverImage: null,
          author: 'Hivhestın',
          published: false,
          publishedAt: null,
          translations,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Taslak kaydedilemedi')
      }

      if (data?.post) {
        setForm(fromRow(data.post))
        setActiveLocale('tr')
        setQuality(null)
        setFormOpen(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      if (warnings.length > 0) setAiWarning(warnings.join(' '))
      setMessage(
        `AI taslağı oluşturuldu${tr.model ? ` (${tr.model})` : ''}. Kontrol edip yayınlayabilirsiniz.`
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Taslak üretilemedi')
    } finally {
      setAiGenerating(false)
    }
  }

  const renderTranslationFields = (localeKey: LocaleKey) => (
    <div className='space-y-4'>
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-2'>
          <Label>Başlık</Label>
          <Input
            value={form.translations[localeKey].title}
            onChange={(e) => updateTranslation(localeKey, { title: e.target.value })}
          />
        </div>
        <div className='space-y-2'>
          <Label>Slug</Label>
          <Input
            value={form.translations[localeKey].slug}
            onChange={(e) => updateTranslation(localeKey, { slug: e.target.value })}
          />
        </div>
      </div>

      <div className='space-y-2'>
        <Label>Özet</Label>
        <Textarea
          rows={3}
          value={form.translations[localeKey].excerpt}
          onChange={(e) => updateTranslation(localeKey, { excerpt: e.target.value })}
        />
      </div>

      <div className='space-y-2'>
        <Label>İçerik (HTML)</Label>
        <Textarea
          rows={14}
          value={form.translations[localeKey].contentHtml}
          onChange={(e) => updateTranslation(localeKey, { contentHtml: e.target.value })}
          placeholder='<h2>Başlık</h2><p>...'
          className='font-mono text-xs'
        />
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-2'>
          <Label>Meta başlık</Label>
          <Input
            value={form.translations[localeKey].metaTitle}
            onChange={(e) => updateTranslation(localeKey, { metaTitle: e.target.value })}
          />
        </div>
        <div className='space-y-2'>
          <Label>Meta açıklama</Label>
          <Input
            value={form.translations[localeKey].metaDescription}
            onChange={(e) => updateTranslation(localeKey, { metaDescription: e.target.value })}
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className='space-y-6 p-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold'>Blog</h1>
          <p className='text-sm text-muted-foreground'>Yazıları oluşturun, düzenleyin ve yayınlayın.</p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm())
            setFormOpen(true)
          }}
        >
          <Plus className='mr-2 h-4 w-4' /> Yeni Yazı
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Sparkles className='h-4 w-4' /> AI ile Taslak Üret
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-sm text-muted-foreground'>
            Konu girin; ücretsiz modeller tarayıcıda Türkçe ve İngilizce taslak oluşturur.
            Taslaklar otomatik yayınlanmaz, önce siz kontrol edersiniz.
          </p>

          <div className='space-y-2'>
            <Label>OpenRouter API anahtarı</Label>
            <div className='flex flex-wrap gap-2'>
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder='sk-or-v1-...'
                disabled={aiGenerating}
                autoComplete='off'
                className='min-w-[240px] flex-1'
              />
              <Button
                type='button'
                variant='outline'
                onClick={() => setShowApiKey((value) => !value)}
                disabled={aiGenerating}
              >
                {showApiKey ? 'Gizle' : 'Göster'}
              </Button>
              <Button
                type='button'
                variant='outline'
                disabled={aiGenerating}
                onClick={() => {
                  setOpenRouterKey('')
                  try {
                    window.localStorage.removeItem('openrouter_api_key')
                  } catch {
                    // localStorage unavailable
                  }
                }}
              >
                Temizle
              </Button>
            </div>
            <p className='text-xs text-muted-foreground'>
              Anahtar yalnızca bu tarayıcıda saklanır ve doğrudan OpenRouter’a gönderilir;
              Vercel’e gitmez. Sınırlı kotalı bir anahtar kullanın.
            </p>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Konu</Label>
              <Input
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder='Örn: 3D baskı figürler ev dekorasyonunda nasıl kullanılır?'
                disabled={aiGenerating}
              />
            </div>
            <div className='space-y-2'>
              <Label>Anahtar kelimeler (opsiyonel)</Label>
              <Input
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
                placeholder='3d baskı figür, ev dekorasyonu'
                disabled={aiGenerating}
              />
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <Button
              onClick={generateDraft}
              disabled={aiGenerating || aiTopic.trim().length < 5 || !openRouterKey.trim()}
            >
              <Sparkles className='mr-2 h-4 w-4' />
              {aiGenerating ? 'Üretiliyor...' : 'Taslak Üret'}
            </Button>
            {aiGenerating ? (
              <span className='text-xs text-muted-foreground'>
                Model yazıyor; bu işlem biraz sürebilir.
              </span>
            ) : null}
          </div>
          {aiWarning ? <p className='text-sm text-amber-600'>{aiWarning}</p> : null}
        </CardContent>
      </Card>

      {message ? <p className='text-sm text-green-600'>{message}</p> : null}
      {error ? <p className='text-sm text-destructive'>{error}</p> : null}

      {formOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? 'Yazıyı Düzenle' : 'Yeni Yazı'}</CardTitle>
          </CardHeader>
          <CardContent className='space-y-5'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <div className='space-y-2'>
                <Label>Post slug</Label>
                <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
              </div>
              <div className='space-y-2'>
                <Label>Yazar</Label>
                <Input value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} />
              </div>
              <div className='space-y-2'>
                <Label>Kapak görseli URL</Label>
                <Input value={form.coverImage} onChange={(e) => setForm((p) => ({ ...p, coverImage: e.target.value }))} />
              </div>
              <div className='space-y-2'>
                <Label>Yayın tarihi</Label>
                <Input
                  type='datetime-local'
                  value={form.publishedAt}
                  onChange={(e) => setForm((p) => ({ ...p, publishedAt: e.target.value }))}
                />
              </div>
            </div>

            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                className='h-4 w-4'
                checked={form.published}
                onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
              />
              Yayında
            </label>

            <Tabs value={activeLocale} onValueChange={(value) => setActiveLocale(value as LocaleKey)}>
              <TabsList>
                <TabsTrigger value='tr'>Türkçe</TabsTrigger>
                <TabsTrigger value='en'>English</TabsTrigger>
              </TabsList>
              <TabsContent value='tr' className='pt-4'>
                {renderTranslationFields('tr')}
              </TabsContent>
              <TabsContent value='en' className='pt-4'>
                {renderTranslationFields('en')}
              </TabsContent>
            </Tabs>

            {quality ? (
              <div className='space-y-2 rounded-lg border p-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p className='text-sm font-medium'>
                    Kalite Kontrol ({qualityLocale.toUpperCase()})
                  </p>
                  <span
                    className={
                      quality.level === 'fail'
                        ? 'text-sm font-semibold text-destructive'
                        : quality.level === 'warn'
                          ? 'text-sm font-semibold text-amber-600'
                          : 'text-sm font-semibold text-green-600'
                    }
                  >
                    Skor: {quality.score}/100
                  </span>
                </div>
                <ul className='space-y-1 text-sm'>
                  {quality.checks.map((item) => (
                    <li key={item.id} className='flex gap-2'>
                      <span
                        className={
                          item.status === 'fail'
                            ? 'text-destructive'
                            : item.status === 'warn'
                              ? 'text-amber-600'
                              : 'text-green-600'
                        }
                      >
                        {item.status === 'pass' ? '✓' : item.status === 'warn' ? '!' : '✗'}
                      </span>
                      <span>
                        <strong>{item.label}:</strong> {item.detail}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className='text-xs text-muted-foreground'>
                  Yayında işaretliyken kaydetmek için kritik (✗) maddelerin tamamı geçmeli.
                </p>
              </div>
            ) : null}

            <div className='flex flex-wrap gap-2'>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
              <Button
                variant='outline'
                onClick={() => runQualityCheck()}
                disabled={checkingQuality || saving}
              >
                {checkingQuality ? 'Kontrol ediliyor...' : 'Kalite Kontrol'}
              </Button>
              <Button variant='outline' onClick={resetForm} disabled={saving}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Yazılar</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex max-w-md items-center gap-2'>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Başlık veya slug ara'
            />
            <Button variant='outline' onClick={load} disabled={loading}>
              <Search className='mr-2 h-4 w-4' /> Ara
            </Button>
          </div>

          <div className='divide-y rounded-lg border'>
            {posts.length === 0 ? (
              <p className='p-4 text-sm text-muted-foreground'>
                {loading ? 'Yükleniyor...' : 'Henüz yazı yok.'}
              </p>
            ) : (
              posts.map((post) => {
                const tr = post.translations.find((t) => t.locale === 'tr') || post.translations[0]
                return (
                  <div key={post.id} className='flex flex-wrap items-center justify-between gap-3 p-4'>
                    <div className='min-w-0'>
                      <p className='truncate font-medium'>{tr?.title || post.slug}</p>
                      <p className='truncate text-xs text-muted-foreground'>
                        /{locale}/blog/{tr?.slug || post.slug}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge variant={post.published ? 'default' : 'secondary'}>
                        {post.published ? 'Yayında' : 'Taslak'}
                      </Badge>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setForm(fromRow(post))
                          setActiveLocale('tr')
                          setQuality(null)
                          setFormOpen(true)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        <Pencil className='mr-1 h-4 w-4' /> Düzenle
                      </Button>
                      <Button variant='destructive' size='sm' onClick={() => remove(post)}>
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
