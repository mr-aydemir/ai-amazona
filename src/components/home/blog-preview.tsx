import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { BlogListItem } from '@/lib/blog'
import { BlogCoverImage } from '@/components/blog/blog-cover-image'

type BlogPreviewProps = {
  locale: string
  posts: BlogListItem[]
}

export function BlogPreview({ locale, posts }: BlogPreviewProps) {
  if (posts.length === 0) return null

  const isEn = locale.startsWith('en')
  const dateFormatter = new Intl.DateTimeFormat(isEn ? 'en-US' : 'tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <section className='container mx-auto px-4 sm:px-6 lg:px-8'>
      <div className='mb-6 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            {isEn ? 'From the Blog' : 'Blogdan'}
          </h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            {isEn
              ? 'Guides and tips about 3D printing, home decor and product care.'
              : '3D baskı, ev dekorasyonu ve ürün bakımı üzerine rehberler ve ipuçları.'}
          </p>
        </div>
        <Button variant='outline' asChild>
          <Link href={`/${locale}/blog`}>{isEn ? 'All posts' : 'Tüm yazılar'}</Link>
        </Button>
      </div>

      <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {posts.map((post) => {
          const href = `/${locale}/blog/${post.slug}`
          return (
            <Card key={post.id} className='overflow-hidden'>
              <Link href={href} className='block'>
                <div className='h-48 w-full overflow-hidden bg-muted'>
                  <BlogCoverImage
                    src={post.coverImage}
                    alt={post.title}
                    fallbackSrc={`/images/blog/${post.canonicalSlug}.svg`}
                    className='h-full w-full object-cover'
                  />
                </div>
              </Link>
              <CardContent className='space-y-2 p-4'>
                <p className='text-xs text-muted-foreground'>
                  {dateFormatter.format(new Date(post.publishedAt || post.createdAt))}
                </p>
                <Link href={href} className='block'>
                  <h3 className='line-clamp-2 font-semibold leading-snug hover:underline'>
                    {post.title}
                  </h3>
                </Link>
                <p className='line-clamp-3 text-sm text-muted-foreground'>{post.excerpt}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
