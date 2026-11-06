import { getTranslations } from 'next-intl/server'
import { Star } from 'lucide-react'

export type HomeReview = {
  id: string
  rating: number
  comment: string | null
  author: string
  productName: string
  source?: string | null
}

const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  TRENDYOL: { label: 'Trendyol', className: 'bg-[#f27a1a]/10 text-[#c85f0c]' },
  HEPSIBURADA: { label: 'Hepsiburada', className: 'bg-[#ff6000]/10 text-[#c84a00]' },
}

function Stars({ rating, size = 'h-4 w-4' }: { rating: number; size?: string }) {
  const rounded = Math.round(rating)
  return (
    <div className='flex items-center gap-0.5' aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= rounded ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

export async function HomeReviews({
  reviews,
  average,
  total,
}: {
  reviews: HomeReview[]
  average: number
  total: number
}) {
  if (!reviews.length) return null
  const t = await getTranslations('home.reviews')

  return (
    <section className='container mx-auto px-4 sm:px-6 lg:px-8'>
      <div className='rounded-2xl border bg-card p-6 sm:p-8'>
        <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h2 className='text-2xl font-bold'>{t('title')}</h2>
            <p className='text-sm text-muted-foreground'>{t('subtitle')}</p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Stars rating={average} />
            <span className='text-sm font-semibold'>{average.toFixed(1)}/5</span>
            <span className='text-xs text-muted-foreground'>{t('based_on', { count: total })}</span>
          </div>
        </div>

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {reviews.map((review) => (
            <figure key={review.id} className='flex flex-col rounded-xl border bg-background p-4'>
              <Stars rating={review.rating} size='h-3.5 w-3.5' />
              <blockquote className='mt-2 line-clamp-4 flex-1 text-sm text-muted-foreground'>
                “{review.comment}”
              </blockquote>
              <figcaption className='mt-3 flex flex-wrap items-center gap-1.5 text-xs'>
                <span className='font-medium'>{review.author}</span>
                {review.source && SOURCE_LABELS[review.source] ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_LABELS[review.source].className}`}
                  >
                    {SOURCE_LABELS[review.source].label}
                  </span>
                ) : null}
                <span className='text-muted-foreground'>{review.productName}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
