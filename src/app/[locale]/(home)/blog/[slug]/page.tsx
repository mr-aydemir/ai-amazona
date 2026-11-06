import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { CalendarDays, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPublishedBlogPost, getRelatedCategories } from '@/lib/blog'
import { sanitizeRichHtml } from '@/lib/sanitize-html'

export const revalidate = 600

type PageProps = {
  params: Promise<{ locale: string; slug: string }>
}

function siteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

function plainText(html: string, max = 300) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const base = siteBase()
  const post = await getPublishedBlogPost(locale, slug)
  if (!post) {
    return { title: 'Blog | Hivhestın', robots: { index: false, follow: false } }
  }

  const isEn = locale.startsWith('en')
  const title = post.metaTitle || post.title
  const description = (post.metaDescription || post.excerpt || plainText(post.contentHtml, 160)).slice(0, 160)
  const url = `${base}/${locale}/blog/${post.slug}`
  const image = post.coverImage || `${base}/logo.png`

  return {
    title: `${title} | Hivhestın`,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: `${base}/tr/blog/${post.localeSlugs.tr || post.slug}`,
        en: `${base}/en/blog/${post.localeSlugs.en || post.slug}`,
        'x-default': `${base}/tr/blog/${post.localeSlugs.tr || post.slug}`,
      },
    },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      images: [{ url: image }],
      locale: isEn ? 'en_US' : 'tr_TR',
      publishedTime: (post.publishedAt || post.createdAt).toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: { index: true, follow: true },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale, slug } = await params
  const post = await getPublishedBlogPost(locale, slug)
  if (!post) notFound()

  const t = await getTranslations('blog')
  const categories = await getRelatedCategories(locale, 4)
  const base = siteBase()
  const isEn = locale.startsWith('en')
  const dateLocale = isEn ? 'en-US' : 'tr-TR'
  const publishedDate = post.publishedAt || post.createdAt
  const url = `${base}/${locale}/blog/${post.slug}`
  const html = sanitizeRichHtml(post.contentHtml)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    image: post.coverImage ? [post.coverImage] : [`${base}/logo.png`],
    datePublished: publishedDate.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'Hivhestın',
      logo: { '@type': 'ImageObject', url: `${base}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    inLanguage: isEn ? 'en' : 'tr',
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('home'), item: `${base}/${locale}` },
      { '@type': 'ListItem', position: 2, name: t('title'), item: `${base}/${locale}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  }

  return (
    <article className='container mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className='mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
        <Link href={`/${locale}`} className='hover:text-primary'>
          {t('home')}
        </Link>
        <span>/</span>
        <Link href={`/${locale}/blog`} className='hover:text-primary'>
          {t('title')}
        </Link>
        <span>/</span>
        <span className='line-clamp-1 text-foreground'>{post.title}</span>
      </nav>

      <header className='mb-8'>
        <h1 className='text-3xl font-bold leading-tight sm:text-4xl'>{post.title}</h1>
        <p className='mt-3 text-lg text-muted-foreground'>{post.excerpt}</p>
        <div className='mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
          <span className='inline-flex items-center gap-1.5'>
            <User className='h-4 w-4' />
            {post.author}
          </span>
          <span className='inline-flex items-center gap-1.5'>
            <CalendarDays className='h-4 w-4' />
            {new Date(publishedDate).toLocaleDateString(dateLocale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </header>

      {post.coverImage ? (
        <img
          src={post.coverImage}
          alt={post.title}
          className='mb-8 aspect-[16/9] w-full rounded-xl object-cover'
          loading='eager'
        />
      ) : null}

      <div
        className='prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-24'
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className='mt-10'>
        <Button asChild variant='outline'>
          <Link href={`/${locale}/blog`}>← {t('back')}</Link>
        </Button>
      </div>

      <section className='mt-12'>
        <h2 className='mb-4 text-xl font-semibold'>{t('related')}</h2>
        <div className='grid gap-4 sm:grid-cols-2'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>{t('related_products')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/${locale}/products`} className='text-sm text-primary hover:underline'>
                {t('related_products')} →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>{t('related_categories')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className='space-y-1.5'>
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/${locale}/products?category=${encodeURIComponent(category.slug)}`}
                      className='text-sm text-muted-foreground hover:text-primary'
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </article>
  )
}
