import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { evaluateBlogTranslations } from '@/lib/blog-quality-server'

export const runtime = 'nodejs'

function isAdmin(session: any) {
  return session?.user && session.user.role === 'ADMIN'
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const locale = body?.locale === 'en' ? 'en' : 'tr'
    const title = typeof body?.title === 'string' ? body.title : ''
    const excerpt = typeof body?.excerpt === 'string' ? body.excerpt : ''
    const contentHtml = typeof body?.contentHtml === 'string' ? body.contentHtml : ''
    const metaTitle = typeof body?.metaTitle === 'string' ? body.metaTitle : ''
    const metaDescription = typeof body?.metaDescription === 'string' ? body.metaDescription : ''
    const excludeId = typeof body?.id === 'string' ? body.id : undefined

    if (!title.trim() || !contentHtml.trim()) {
      return NextResponse.json({ error: 'Başlık ve içerik gerekli' }, { status: 422 })
    }

    const [evaluation] = await evaluateBlogTranslations(
      [{ locale, title, excerpt, contentHtml, metaTitle, metaDescription }],
      excludeId
    )

    return NextResponse.json({ locale, ...evaluation.result })
  } catch (error) {
    console.error('[ADMIN_BLOG_QUALITY_CHECK] Error:', error)
    return NextResponse.json({ error: 'Kalite kontrolü yapılamadı' }, { status: 500 })
  }
}
