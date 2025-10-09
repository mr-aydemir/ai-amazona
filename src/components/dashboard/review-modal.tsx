'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

type ReviewModalProps = {
  productId: string
  productName?: string
}

export default function ReviewModal({ productId, productName }: ReviewModalProps) {
  const t = useTranslations('products.reviews')
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canReview, setCanReview] = useState<boolean | null>(null)
  const [existingReview, setExistingReview] = useState<null | { id: string; rating: number; comment: string | null }>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/reviews?productId=${productId}`)
        if (!res.ok) {
          if (!cancelled) setCanReview(false)
          return
        }
        const data = await res.json()
        if (!cancelled) {
          setCanReview(Boolean(data?.canReview))
          const r = data?.review
          if (r) {
            setExistingReview({ id: r.id, rating: r.rating, comment: r.comment })
            setRating(typeof r.rating === 'number' ? r.rating : 5)
            setComment(typeof r.comment === 'string' ? r.comment : '')
          } else {
            setExistingReview(null)
            setRating(5)
            setComment('')
          }
        }
      } catch {
        if (!cancelled) setCanReview(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, productId])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/reviews', {
        method: existingReview ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, comment }),
      })
      if (!res.ok) throw new Error('Failed to submit review')
      toast({ title: t('review_submitted') })
      setOpen(false)
      setRating(5)
      setComment('')
      setExistingReview(null)
    } catch (error) {
      toast({ title: 'Error', description: 'Değerlendirme gönderilemedi', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm'>{t('write_review')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('write_review')}{productName ? ` • ${productName}` : ''}
          </DialogTitle>
        </DialogHeader>

        {canReview === false && !existingReview ? (
          <div className='bg-muted p-3 rounded-md text-sm'>{t('only_purchasers')}</div>
        ) : (
          <div className='space-y-4'>
            {existingReview && (
              <div className='text-sm text-muted-foreground'>Mevcut değerlendirmenizi düzenleyebilirsiniz.</div>
            )}
            <div>
              <div className='text-sm font-medium mb-2'>{t('your_rating')}</div>
              <div className='flex gap-1'>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type='button' onClick={() => setRating(star)} className='focus:outline-none'>
                    <Star className={`w-6 h-6 ${star <= rating ? 'fill-primary text-primary' : 'fill-muted text-muted'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className='text-sm font-medium mb-2'>{t('your_review')}</div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('write_review_placeholder')}
                required
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>{/* common close */}Kapat</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (canReview === false && !existingReview)}>
            {isSubmitting ? t('submitting') : existingReview ? 'Güncelle' : t('submit_review')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}