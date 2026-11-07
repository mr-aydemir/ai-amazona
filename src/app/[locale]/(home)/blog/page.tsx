import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { CalendarDays, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BLOG_PAGE_SIZE, getPublishedBlogPosts } from '@/lib/blog'
import { BlogCoverImage } from '@/components/blog/blog-cover-image'

export const revalidate = 600

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function siteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const page = parseInt(raw || '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function pageNumbers(current: number, total: number): number[] {
  const windowSize = 5
  let start = Math.max(1, current - Math.floor(windowSize / 2))
  const end = Math.min(total, start + windowSize - 1)
  start = Math.max(1, Math.min(start, end - windowSize + 1))
  const pages: number[] = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const sp = await searchParams
  const page = parsePage(sp.page)
  const isEn = locale.startsWith('en')
  const base = siteBase()
  const title = isEn ? 'Blog | Hivhestın' : 'Blog | Hivhestın'
  const description = isEn
    ? 'Guides on 3D printing, material selection and home decoration from Hivhestın.'
    : 'Hivhestın’dan 3D baskı, malzeme seçimi ve ev dekorasyonu üzerine rehber yazılar.'
  const path = `${base}/${locale}/blog${page > 1 ? `?page=${page}` : ''}`

  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: {
        tr: `${base}/tr/blog${page > 1 ? `?page=${page}` : ''}`,
        en: `${base}/en/blog${page > 1 ? `?page=${page}` : ''}`,
        'x-default': `${base}/tr/blog${page > 1 ? `?page=${page}` : ''}`,
      },
    },
    openGraph: {
      type: 'website',
      url: path,
      title,
      description,
    },
    robots: { index: true, follow: true },
  }
}

export default async function BlogListPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const sp = await searchParams
  const page = parsePage(sp.page)
  const t = await getTranslations('blog')
  const { items, totalPages, total } = await getPublishedBlogPosts(locale, page, BLOG_PAGE_SIZE)
  const dateLocale = locale.startsWith('en') ? 'en-US' : 'tr-TR'

  return (
    <div className='container mx-auto px-4 py-10 sm:px-6 lg:px-8'>
      <header className='mb-8 max-w-3xl'>
        <h1 className='text-3xl font-bold sm:text-4xl'>{t('title')}</h1>
        <p className='mt-3 text-muted-foreground'>{t('subtitle')}</p>
      </header>

      {items.length === 0 ? (
        <p className='text-muted-foreground'>{t('empty')}</p>
      ) : (
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {items.map((post) => {
            const date = post.publishedAt || post.createdAt
            return (
              <Link
                key={post.id}
                href={`/${locale}/blog/${post.slug}`}
                className='group block'
              >
                <Card className='h-full overflow-hidden transition-shadow group-hover:shadow-md'>
                  <div className='relative aspect-[16/9] w-full overflow-hidden bg-muted'>
                    <BlogCoverImage
                      src={post.coverImage}
                      alt={post.title}
                      fallbackSrc={`/images/blog/${post.canonicalSlug}.svg`}
                      className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]'
                    />
                  </div>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-lg leading-snug transition-colors group-hover:text-primary'>
                      {post.title}
                    </CardTitle>
                    <div className='flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
                      <span className='inline-flex items-center gap-1'>
                        <CalendarDays className='h-3.5 w-3.5' />
                        {new Date(date).toLocaleDateString(dateLocale, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                      <span className='inline-flex items-center gap-1'>
                        <User className='h-3.5 w-3.5' />
                        {post.author}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className='line-clamp-3 text-sm text-muted-foreground'>{post.excerpt}</p>
                    <span className='mt-3 inline-block text-sm font-medium text-primary'>
                      {t('read_more')} →
                    </span>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className='mt-10 flex flex-wrap items-center justify-center gap-2' aria-label='pagination'>
          <Button variant='outline' size='sm' asChild disabled={page <= 1}>
            <Link
              href={page <= 2 ? `/${locale}/blog` : `/${locale}/blog?page=${page - 1}`}
              aria-disabled={page <= 1}
              className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
            >
              {t('prev')}
            </Link>
          </Button>

          {pageNumbers(page, totalPages).map((num) => (
            <Button key={num} variant={num === page ? 'default' : 'outline'} size='sm' asChild>
              <Link href={num === 1 ? `/${locale}/blog` : `/${locale}/blog?page=${num}`}>{num}</Link>
            </Button>
          ))}

          <Button variant='outline' size='sm' asChild disabled={page >= totalPages}>
            <Link
              href={`/${locale}/blog?page=${page + 1}`}
              aria-disabled={page >= totalPages}
              className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
            >
              {t('next')}
            </Link>
          </Button>
        </nav>
      ) : null}

      <p className='mt-6 text-center text-xs text-muted-foreground'>
        {t('page_of', { page: Math.min(page, totalPages), total: totalPages })}
        {total > 0 ? ` · ${total}` : ''}
      </p>
    </div>
  )
}
