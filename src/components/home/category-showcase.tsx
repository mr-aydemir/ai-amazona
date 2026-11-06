import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export type ShowcaseCategory = {
  id: string
  name: string
  slug: string | null
  image: string | null
  count: number
}

export async function CategoryShowcase({
  locale,
  categories,
}: {
  locale: string
  categories: ShowcaseCategory[]
}) {
  if (!categories.length) return null
  const t = await getTranslations('home.categories')

  return (
    <section className='container mx-auto px-4 sm:px-6 lg:px-8'>
      <div className='mb-6 flex items-end justify-between gap-4'>
        <h2 className='text-2xl font-bold'>{t('title')}</h2>
        <Link href={`/${locale}/products`} className='text-sm font-medium text-primary hover:underline'>
          {t('view_all')}
        </Link>
      </div>

      <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/${locale}/products?category=${encodeURIComponent(category.slug ?? category.id)}`}
            className='group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md'
          >
            <div
              className='relative aspect-[4/3] bg-muted bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]'
              style={category.image ? { backgroundImage: `url(${category.image})` } : undefined}
            >
              {!category.image ? (
                <span className='absolute inset-0 flex items-center justify-center text-2xl font-bold text-muted-foreground/60'>
                  {category.name.slice(0, 2).toUpperCase()}
                </span>
              ) : null}
            </div>
            <div className='p-3'>
              <p className='truncate font-medium'>{category.name}</p>
              <p className='text-xs text-muted-foreground'>{t('products', { count: category.count })}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
