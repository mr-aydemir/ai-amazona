import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import * as z from 'zod'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

function isAdmin(session: any) {
  return session?.user && session.user.role === 'ADMIN'
}

const translationSchema = z.object({
  locale: z.enum(['tr', 'en']),
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().min(1),
  contentHtml: z.string().min(1),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
})

const postSchema = z.object({
  slug: z.string().min(1),
  coverImage: z.string().optional().nullable(),
  author: z.string().min(1),
  published: z.boolean().optional(),
  publishedAt: z.string().optional().nullable(),
  translations: z.array(translationSchema).min(1),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20))
    const search = (searchParams.get('search') || '').trim()

    const where: Prisma.BlogPostWhereInput = search
      ? {
          translations: {
            some: {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        }
      : {}

    const [total, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        include: { translations: true },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({ items: posts, total, page, limit })
  } catch (error) {
    console.error('[ADMIN_BLOG_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = postSchema.parse(body)

    const post = await prisma.blogPost.create({
      data: {
        slug: data.slug,
        coverImage: data.coverImage || null,
        author: data.author,
        published: data.published ?? false,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        translations: {
          create: data.translations.map((translation) => ({
            locale: translation.locale,
            title: translation.title,
            slug: translation.slug,
            excerpt: translation.excerpt,
            contentHtml: translation.contentHtml,
            metaTitle: translation.metaTitle || null,
            metaDescription: translation.metaDescription || null,
          })),
        },
      },
      include: { translations: true },
    })

    return NextResponse.json({ post })
  } catch (error) {
    console.error('[ADMIN_BLOG_POST] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 })
  }
}
