'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Loader2, MessageSquare, Check } from 'lucide-react'
import { toast } from 'sonner'

interface QuestionItem {
  id: string
  content: string
  isPublic: boolean
  hideName: boolean
  createdAt: string
  answer?: string | null
  answeredAt?: string | null
  productName: string
  askerName: string
  askerEmail: string
  answeredByName?: string
}

export default function AdminQuestionsPage() {
  const locale = useLocale()
  const t = useTranslations('admin.questions')

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<QuestionItem[]>([])
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  const [openAnswer, setOpenAnswer] = useState<QuestionItem | null>(null)
  const [answerText, setAnswerText] = useState('')

  const paramsBuilder = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      locale: String(locale),
    })
    if (search) params.set('search', search)
    return params
  }, [page, limit, locale, search])

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/questions?${paramsBuilder.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total || 0))
    } catch (e) {
      toast.error('Sorular yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, locale])

  const resetAndRefresh = () => {
    setPage(1)
    fetchQuestions()
  }

  const handleAnswer = async (q: QuestionItem, answer: string) => {
    try {
      setLoading(true)
      const res = await fetch('/api/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: q.id, answer }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Cevap kaydedildi')
      setOpenAnswer(null)
      setAnswerText('')
      resetAndRefresh()
    } catch (e) {
      toast.error('Cevap kaydedilemedi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight'>{t('title')}</h2>
        <p className='text-muted-foreground'>{t('description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>{t('title')}</span>
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
              <Button variant='outline' onClick={resetAndRefresh}>{t('refresh')}</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.user')}</TableHead>
                  <TableHead>{t('table.email')}</TableHead>
                  <TableHead>{t('table.product')}</TableHead>
                  <TableHead>{t('table.question')}</TableHead>
                  <TableHead>{t('table.public')}</TableHead>
                  <TableHead>{t('table.hidden_name')}</TableHead>
                  <TableHead>{t('table.created_at')}</TableHead>
                  <TableHead>{t('table.answer')}</TableHead>
                  <TableHead>{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className='text-center py-8'>
                      <div className='flex items-center justify-center gap-2 text-muted-foreground'>
                        <Loader2 className='h-4 w-4 animate-spin' /> {t('loading')}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className='text-center py-8'>
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className='font-medium'>{q.askerName}</TableCell>
                      <TableCell>{q.askerEmail || '-'}</TableCell>
                      <TableCell>{q.productName || '-'}</TableCell>
                      <TableCell className='max-w-[320px] truncate'>{q.content}</TableCell>
                      <TableCell>{q.isPublic ? t('yes') : t('no')}</TableCell>
                      <TableCell>{q.hideName ? t('yes') : t('no')}</TableCell>
                      <TableCell>{new Date(q.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        {q.answer ? (
                          <div className='flex items-center gap-2 text-green-700'><Check className='h-4 w-4' /> {t('answered')}</div>
                        ) : (
                          <div className='text-muted-foreground'>-</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size='sm' variant='outline' onClick={() => { setOpenAnswer(q); setAnswerText(q.answer || '') }}>
                          <MessageSquare className='mr-2 h-4 w-4' /> {q.answer ? t('update') : t('reply')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!openAnswer} onOpenChange={(v) => !v && setOpenAnswer(null)}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{t('answer_modal.title')}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <label className='text-sm font-medium'>{t('labels.question')}</label>
              <div className='text-sm text-muted-foreground whitespace-pre-wrap'>{openAnswer?.content}</div>
            </div>
            <div>
              <label className='text-sm font-medium'>{t('labels.answer')}</label>
              <Textarea rows={6} value={answerText} onChange={(e) => setAnswerText(e.target.value)} />
            </div>
            <div className='flex justify-end gap-2'>
              <Button variant='outline' onClick={() => setOpenAnswer(null)}>{t('answer_modal.cancel')}</Button>
              <Button onClick={() => openAnswer && handleAnswer(openAnswer, answerText)}>{t('answer_modal.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}