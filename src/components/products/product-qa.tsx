'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { enUS, tr as trLocale } from 'date-fns/locale'

interface QAItem {
  id: string
  content: string
  isPublic: boolean
  hideName: boolean
  createdAt: string | Date
  answer?: string | null
  answeredAt?: string | Date | null
  user?: { name: string | null; image?: string | null; email?: string | null } | null
  guestName?: string | null
  guestEmail?: string | null
}

export default function ProductQA({ productId }: { productId: string }) {
  const { data: session } = useSession()
  const t = useTranslations('products.qa')
  const locale = useLocale()
  const dateLocale = locale?.startsWith('tr') ? trLocale : enUS

  const [items, setItems] = useState<QAItem[]>([])
  const [question, setQuestion] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [hideName, setHideName] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/questions?productId=${productId}`)
        if (!res.ok) return
        const data = await res.json()
        const list: QAItem[] = data?.items || []
        if (!cancelled) setItems(list)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [productId])

  const displayName = (item: QAItem) => {
    if (item.hideName) return t('anonymous', { default: 'Anonim' })
    return item.user?.name || item.guestName || t('anonymous', { default: 'Anonim' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    if (!session?.user) {
      if (!guestName.trim() || !guestEmail.trim()) return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          content: question.trim(),
          isPublic,
          hideName,
          ...(session?.user ? {} : { guestName: guestName.trim(), guestEmail: guestEmail.trim() })
        })
      })
      if (!res.ok) throw new Error('Failed')
      const payload = await res.json()
      const created: QAItem = {
        id: payload?.question?.id || 'temp',
        content: question.trim(),
        isPublic,
        hideName,
        createdAt: new Date().toISOString(),
        user: session?.user ? { name: session.user.name ?? null, image: session.user.image ?? null, email: session.user.email ?? null } : null,
        guestName: session?.user ? null : guestName.trim(),
        guestEmail: session?.user ? null : guestEmail.trim(),
      }
      setItems(prev => [created, ...prev])
      setQuestion('')
      setHideName(false)
      setIsPublic(true)
      setGuestName('')
      setGuestEmail('')
    } catch (e) {
      console.error('Submit question error', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='space-y-6'>
      <h2 className='text-2xl font-bold'>{t('title')}</h2>

      {/* Ask Question Form */}
      <form onSubmit={handleSubmit} className='space-y-4'>
        {!session?.user && (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <Input
                placeholder={t('guest_name_label')}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                placeholder={t('guest_email_label')}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
                type='email'
              />
            </div>
          </div>
        )}

        <div>
          <Textarea
            placeholder={t('question_placeholder')}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
          />
        </div>

        <div className='flex items-center gap-6'>
          <label className='flex items-center gap-2 text-sm'>
            <Checkbox checked={isPublic} onCheckedChange={(v) => setIsPublic(Boolean(v))} />
            <span>{t('public_label')}</span>
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <Checkbox checked={hideName} onCheckedChange={(v) => setHideName(Boolean(v))} />
            <span>{t('hide_name_label')}</span>
          </label>
        </div>

        <Button type='submit' disabled={isSubmitting || (!session?.user && (!guestName.trim() || !guestEmail.trim()))}>
          {isSubmitting ? t('submitting') : t('submit_question')}
        </Button>
      </form>

      {/* Public Q&A List */}
      <div className='space-y-4'>
        {items.length === 0 ? (
          <p className='text-muted-foreground'>{t('no_questions')}</p>
        ) : (
          items
            .filter((it) => it.isPublic)
            .map((it) => (
              <div key={it.id} className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <Avatar>
                    <AvatarImage src={it.user?.image || undefined} />
                    <AvatarFallback>{displayName(it)?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className='font-medium'>{displayName(it)}</div>
                    <div className='text-sm text-muted-foreground'>
                      {formatDistanceToNow(new Date(it.createdAt), { addSuffix: true, locale: dateLocale })}
                    </div>
                  </div>
                </div>
                <div className='text-sm'>{it.content}</div>
                {it.answer ? (
                  <div className='bg-muted p-3 rounded-md text-sm'>
                    <div className='font-medium mb-1'>{t('answer_title')}</div>
                    <div>{it.answer}</div>
                  </div>
                ) : (
                  <div className='text-xs text-muted-foreground'>{t('waiting_for_answer')}</div>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  )
}