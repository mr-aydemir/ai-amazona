import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { collectFailedChecks, evaluateBlogTranslations } from '@/lib/blog-quality-server'

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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const post = await prisma.blogPost.findUnique({ where: { id }, include: { translations: true } })
    if (!post) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('[ADMIN_BLOG_ITEM_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch blog post' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = postSchema.parse(body)

    const existing = await prisma.blogPost.findUnique({
      where: { id },
      select: { id: true, published: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (data.published && !existing.published) {
      const evaluation = await evaluateBlogTranslations(data.translations, id)
      const issues = collectFailedChecks(evaluation)
      if (issues.length > 0) {
        return NextResponse.json(
          { error: 'Yayın kalite kontrolünden geçemedi', issues, evaluation },
          { status: 422 }
        )
      }
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        slug: data.slug,
        coverImage: data.coverImage || null,
        author: data.author,
        published: data.published ?? false,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        translations: {
          upsert: data.translations.map((translation) => ({
            where: { blogPostId_locale: { blogPostId: id, locale: translation.locale } },
            update: {
              title: translation.title,
              slug: translation.slug,
              excerpt: translation.excerpt,
              contentHtml: translation.contentHtml,
              metaTitle: translation.metaTitle || null,
              metaDescription: translation.metaDescription || null,
            },
            create: {
              locale: translation.locale,
              title: translation.title,
              slug: translation.slug,
              excerpt: translation.excerpt,
              contentHtml: translation.contentHtml,
              metaTitle: translation.metaTitle || null,
              metaDescription: translation.metaDescription || null,
            },
          })),
        },
      },
      include: { translations: true },
    })

    return NextResponse.json({ post })
  } catch (error) {
    console.error('[ADMIN_BLOG_ITEM_PUT] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await prisma.blogPost.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ADMIN_BLOG_ITEM_DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 })
  }
}
