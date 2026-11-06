import { cache } from 'react'
import prisma from '@/lib/prisma'

export const BLOG_PAGE_SIZE = 9

export type BlogListItem = {
  id: string
  slug: string
  coverImage: string | null
  author: string
  publishedAt: Date | null
  createdAt: Date
  title: string
  excerpt: string
}

export type BlogPostDetail = BlogListItem & {
  updatedAt: Date
  contentHtml: string
  metaTitle: string | null
  metaDescription: string | null
  localeSlugs: Record<string, string>
}

export type BlogListResult = {
  items: BlogListItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export const getPublishedBlogPosts = cache(
  async (locale: string, page = 1, perPage = BLOG_PAGE_SIZE): Promise<BlogListResult> => {
    const safePage = Math.max(1, Math.floor(page) || 1)
    const where = { published: true, translations: { some: { locale } } }

    try {
      const [total, rows] = await Promise.all([
        prisma.blogPost.count({ where }),
        prisma.blogPost.findMany({
          where,
          include: { translations: { where: { locale } } },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          skip: (safePage - 1) * perPage,
          take: perPage,
        }),
      ])

      const items: BlogListItem[] = []
      for (const post of rows) {
        const translation = post.translations[0]
        if (!translation) continue
        items.push({
          id: post.id,
          slug: translation.slug,
          coverImage: post.coverImage,
          author: post.author,
          publishedAt: post.publishedAt,
          createdAt: post.createdAt,
          title: translation.title,
          excerpt: translation.excerpt,
        })
      }

      return {
        items,
        total,
        page: safePage,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      }
    } catch (error) {
      console.error('[BLOG_LIST_FETCH]', error)
      return {
        items: [],
        total: 0,
        page: safePage,
        perPage,
        totalPages: 1,
      }
    }
  }
)

export const getPublishedBlogPost = cache(
  async (locale: string, slug: string): Promise<BlogPostDetail | null> => {
    try {
      const post = await prisma.blogPost.findFirst({
        where: { published: true, translations: { some: { locale, slug } } },
        include: { translations: true },
      })
      if (!post) return null

      const current =
        post.translations.find((t) => t.locale === locale && t.slug === slug) ||
        post.translations.find((t) => t.locale === locale)
      if (!current) return null

      const localeSlugs: Record<string, string> = {}
      for (const translation of post.translations) {
        const loc = String(translation.locale || '').split('-')[0]
        if (loc && translation.slug) localeSlugs[loc] = translation.slug
      }

      return {
        id: post.id,
        slug: current.slug,
        coverImage: post.coverImage,
        author: post.author,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        title: current.title,
        excerpt: current.excerpt,
        contentHtml: current.contentHtml,
        metaTitle: current.metaTitle,
        metaDescription: current.metaDescription,
        localeSlugs,
      }
    } catch (error) {
      console.error('[BLOG_POST_FETCH]', error)
      return null
    }
  }
)

export type RelatedCategory = {
  id: string
  name: string
  slug: string
  count: number
}

export const getRelatedCategories = cache(
  async (locale: string, take = 4): Promise<RelatedCategory[]> => {
    try {
      const rows = await prisma.category.findMany({
        where: { products: { some: { status: 'ACTIVE', price: { gt: 0 } } } },
        include: {
          translations: { where: { locale } },
          _count: { select: { products: { where: { status: 'ACTIVE' } } } },
        },
        orderBy: { products: { _count: 'desc' } },
        take,
      })

      return rows.map((category) => ({
        id: category.id,
        name: category.translations[0]?.name || category.name,
        slug: category.translations[0]?.slug || category.slug || category.id,
        count: category._count.products,
      }))
    } catch (error) {
      console.error('[BLOG_CATEGORIES_FETCH]', error)
      return []
    }
  }
)

export const getPublishedBlogStaticParams = cache(async () => {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { translations: { select: { locale: true, slug: true } } },
    })

    return posts.flatMap((post) =>
      post.translations.map((translation) => ({
        locale: translation.locale,
        slug: translation.slug,
      }))
    )
  } catch (error) {
    console.error('[BLOG_STATIC_PARAMS]', error)
    return []
  }
})
