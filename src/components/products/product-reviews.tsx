'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Star } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { enUS, tr as trLocale } from 'date-fns/locale'

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: Date | string
  user: {
    name: string | null
    image?: string | null
    email?: string | null
  } | null
  guestName?: string | null
  guestEmail?: string | null
}

interface ProductReviewsProps {
  productId: string
  reviews: Review[]
  initialItems?: Review[] // SSR'dan gelen yorumlar için
}

export function ProductReviews({ productId, reviews, initialItems }: ProductReviewsProps) {
  const { data: session } = useSession()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const t = useTranslations('products.reviews')
  const locale = useLocale()
  const dateLocale = locale?.startsWith('tr') ? trLocale : enUS
  // SSR'dan gelen initialItems varsa onu kullan, yoksa reviews prop'unu kullan
  const [items, setItems] = useState<Review[]>(initialItems || reviews || [])
  const [canReview, setCanReview] = useState(false)

  useEffect(() => {
    async function checkCanReview() {
      try {
        const res = await fetch(`/api/reviews?productId=${productId}`)
        if (!res.ok) return setCanReview(false)
        const data = await res.json()
        setCanReview(Boolean(data?.canReview))
      } catch {
        setCanReview(false)
      }
    }
    checkCanReview()
  }, [productId, session?.user?.id])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    // For guests, require name and email
    if (!session) {
      if (!guestName.trim() || !guestEmail.trim()) {
        return
      }
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          rating,
          comment,
          ...(session?.user ? {} : { guestName: guestName.trim(), guestEmail: guestEmail.trim() })
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit review')
      }

      const payload = await response.json()
      const createdRaw = payload?.review ?? payload
      const created: Review = {
        id: createdRaw.id,
        rating: createdRaw.rating,
        comment: createdRaw.comment ?? null,
        createdAt: createdRaw.createdAt ?? new Date().toISOString(),
        user: session?.user
          ? { name: session.user.name ?? null, image: session.user.image ?? null, email: session.user.email ?? null }
          : null,
        guestName: createdRaw.guestName ?? null,
        guestEmail: createdRaw.guestEmail ?? null,
      }
      setItems(prev => [created, ...prev])

      // Reset form
      setRating(5)
      setComment('')
      setGuestName('')
      setGuestEmail('')
      // TODO: Update reviews list without full page refresh
    } catch (error) {
      console.error('Error submitting review:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='space-y-8'>
      <h2 className='text-2xl font-bold'>{t('title')}</h2>

      {/* Review Form */}
      {session ? (
        canReview ? (
          <form onSubmit={handleSubmitReview} className='space-y-4'>
            <div>
              <div className='text-sm font-medium mb-2'>{t('your_rating')}</div>
              <div className='flex gap-1'>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type='button'
                    onClick={() => setRating(star)}
                    className='focus:outline-none'
                  >
                    <Star
                      className={`w-6 h-6 ${star <= rating
                        ? 'fill-primary text-primary'
                        : 'fill-muted text-muted'
                        }`}
                    />
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

            <Button type='submit' disabled={isSubmitting || (!session && (!guestName.trim() || !guestEmail.trim()))}>
              {isSubmitting ? t('submitting') : t('submit_review')}
            </Button>
          </form>
        ) : (
          <div className='bg-muted p-4 rounded-lg'>
            <p className='text-sm'>{t('only_purchasers')}</p>
          </div>
        )
      ) : (
        <div className='bg-muted p-4 rounded-lg'>
          <p className='text-sm'>{t('sign_in_to_review')}</p>
        </div>
      )}

      {/* Reviews List */}
      <div className='space-y-6'>
        {items.length === 0 ? (
          <p className='text-muted-foreground'>{t('no_reviews')}</p>
        ) : (
          items.map((review) => (
            <div key={review.id} className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Avatar>
                  <AvatarImage src={review.user?.image || undefined} />
                  <AvatarFallback>
                    {review.user?.name?.charAt(0) || review.guestName?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className='font-medium'>{review.user?.name || review.guestName || t('anonymous', { default: 'Anonim' })}</div>
                  <div className='text-sm text-muted-foreground'>
                    {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: dateLocale })}
                  </div>
                </div>
              </div>

              <div className='flex gap-1'>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= review.rating
                      ? 'fill-primary text-primary'
                      : 'fill-muted text-muted'
                      }`}
                  />
                ))}
              </div>

              {review.comment && <p className='text-sm'>{review.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
