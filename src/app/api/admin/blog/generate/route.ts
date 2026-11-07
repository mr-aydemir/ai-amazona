import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import {
  AiBlogError,
  generateBlogDraft,
  getAiConfig,
  getModelCandidates,
  isAiConfigured,
} from '@/lib/ai-blog'
import { pickBlogCoverImage } from '@/lib/blog-cover-selector'
import { renderBlogCoverSvg } from '@/lib/blog-cover-svg'
import { sanitizeText } from '@/lib/sanitize-html'
import { uniqueSlug } from '@/lib/slugify'

export const runtime = 'nodejs'
export const maxDuration = 60

function isAdmin(session: any) {
  return session?.user && session.user.role === 'ADMIN'
}

// Admin-only diagnostics: confirms which model and key are loaded without
// exposing the key or spending tokens.
export async function GET() {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = getAiConfig()
    return NextResponse.json({
      configured: isAiConfigured(),
      model: config.model,
      models: getModelCandidates(),
      baseUrl: config.baseUrl,
      keyPreview: config.apiKey
        ? `${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}`
        : null,
    })
  } catch (error) {
    console.error('[ADMIN_BLOG_GENERATE_CONFIG]', error)
    return NextResponse.json({ error: 'Failed to read AI config' }, { status: 500 })
  }
}

async function buildContext(locale: 'tr' | 'en') {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      take: 8,
      orderBy: { products: { _count: 'desc' } },
      select: {
        name: true,
        translations: { where: { locale }, select: { name: true } },
      },
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      take: 6,
      orderBy: { updatedAt: 'desc' },
      select: {
        name: true,
        description: true,
        translations: {
          where: { locale },
          select: { name: true, description: true },
        },
      },
    }),
  ])

  return {
    categories: categories
      .map((category) => category.translations[0]?.name || category.name)
      .filter((name): name is string => Boolean(name)),
    products: products
      .map((product) => {
        const translation = product.translations[0]
        const name = translation?.name || product.name
        const description = sanitizeText(translation?.description || product.description || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 180)
        return description ? `${name} — ${description}` : name
      })
      .filter(Boolean),
  }
}

async function uniqueTranslationSlug(locale: 'tr' | 'en', title: string) {
  return uniqueSlug(title, async (candidate) => {
    const existing = await prisma.blogPostTranslation.findUnique({
      where: { locale_slug: { locale, slug: candidate } },
      select: { id: true },
    })
    return Boolean(existing)
  })
}

async function uniquePostSlug(title: string) {
  return uniqueSlug(title, async (candidate) => {
    const existing = await prisma.blogPost.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    return Boolean(existing)
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAiConfigured()) {
      return NextResponse.json(
        {
          error:
            'AI API anahtarı tanımlı değil. Sunucu ortamına OPENROUTER_API_KEY (veya AI_API_KEY) ekleyin.',
        },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => null)
    const topic = typeof body?.topic === 'string' ? body.topic.trim() : ''
    const keywords = typeof body?.keywords === 'string' ? body.keywords.trim() : ''

    if (topic.length < 5 || topic.length > 200) {
      return NextResponse.json(
        { error: 'Konu 5 ile 200 karakter arasında olmalıdır.' },
        { status: 422 }
      )
    }

    const input = { topic, keywords: keywords || undefined }
    const warnings: string[] = []

    const [trContext, enContext] = await Promise.all([buildContext('tr'), buildContext('en')])

    // Run both locales concurrently so the request stays within serverless
    // function limits even when the free model is slow.
    const [trResult, enResult] = await Promise.allSettled([
      generateBlogDraft('tr', input, trContext),
      generateBlogDraft('en', input, enContext),
    ])

    if (trResult.status === 'rejected') {
      console.error('[ADMIN_BLOG_GENERATE_TR]', trResult.reason)
      if (trResult.reason instanceof AiBlogError) {
        return NextResponse.json({ error: trResult.reason.message }, { status: 502 })
      }
      throw trResult.reason
    }

    const trDraft = trResult.value

    let enDraft: Awaited<ReturnType<typeof generateBlogDraft>> | null = null
    if (enResult.status === 'fulfilled') {
      enDraft = enResult.value
    } else {
      warnings.push(
        'İngilizce taslak üretilemedi; yazı yalnızca Türkçe olarak kaydedildi. Daha sonra düzenleyip ekleyebilirsiniz.'
      )
      console.error('[ADMIN_BLOG_GENERATE_EN]', enResult.reason)
    }

    const [postSlug, trSlug] = await Promise.all([
      uniquePostSlug(trDraft.title),
      uniqueTranslationSlug('tr', trDraft.title),
    ])
    const enSlug = enDraft ? await uniqueTranslationSlug('en', enDraft.title) : null

    const translations: Array<{
      locale: 'tr' | 'en'
      title: string
      slug: string
      excerpt: string
      contentHtml: string
      metaTitle: string
      metaDescription: string
    }> = [
      {
        locale: 'tr',
        title: trDraft.title,
        slug: trSlug,
        excerpt: trDraft.excerpt,
        contentHtml: trDraft.contentHtml,
        metaTitle: trDraft.metaTitle,
        metaDescription: trDraft.metaDescription,
      },
    ]

    if (enDraft && enSlug) {
      translations.push({
        locale: 'en',
        title: enDraft.title,
        slug: enSlug,
        excerpt: enDraft.excerpt,
        contentHtml: enDraft.contentHtml,
        metaTitle: enDraft.metaTitle,
        metaDescription: enDraft.metaDescription,
      })
    }

    const post = await prisma.blogPost.create({
      data: {
        slug: postSlug,
        author: 'Hivhestın',
        published: false,
        publishedAt: null,
        translations: { create: translations },
      },
      include: { translations: true },
    })

    let coverImage: string | null = null
    try {
      coverImage = await pickBlogCoverImage({
        title: `${trDraft.title} ${enDraft?.title || ''}`,
        excerpt: `${trDraft.excerpt} ${enDraft?.excerpt || ''}`,
        keywords,
      })
    } catch (error) {
      console.error('[ADMIN_BLOG_GENERATE_COVER]', error)
    }

    if (!coverImage) {
      const svg = renderBlogCoverSvg(trDraft.title, 1)
      coverImage = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    }

    const postWithCover = await prisma.blogPost.update({
      where: { id: post.id },
      data: { coverImage },
      include: { translations: true },
    })

    return NextResponse.json({
      post: postWithCover,
      model: trDraft.model,
      warnings: warnings.length ? warnings : undefined,
    })
  } catch (error) {
    console.error('[ADMIN_BLOG_GENERATE] Error:', error)
    if (error instanceof AiBlogError) {
      console.error('[ADMIN_BLOG_GENERATE_AI]', error.message)
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'Taslak üretilemedi' }, { status: 500 })
  }
}
