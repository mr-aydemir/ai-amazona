import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sanitizeRichHtml, sanitizeText } from '@/lib/sanitize-html'

interface RouteParams {
  params: Promise<{ locale: string }>
}

// Public FAQs by locale
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { locale } = await params
    const faqs = await prisma.fAQ.findMany({
      where: { active: true },
      include: { translations: { where: { locale } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    const items = faqs
      .map((f) => {
        const t = f.translations?.[0]
        if (!t) return null
        return {
          id: f.id,
          question: sanitizeText(t.question),
          answer: sanitizeRichHtml(t.answer),
          sortOrder: f.sortOrder,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ items })
  } catch (error) {
    console.error('[PUBLIC_FAQS_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch FAQs' }, { status: 500 })
  }
}