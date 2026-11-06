import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params

  try {
    const items = await prisma.promoText.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: {
          where: { locale },
          select: { text: true },
        },
      },
    })

    const texts = items
      .map((it) => it.translations[0]?.text?.trim())
      .filter((t): t is string => Boolean(t))

    return NextResponse.json(
      { texts },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' },
      }
    )
  } catch (error) {
    console.error('Failed to fetch promo texts:', error)
    return NextResponse.json({ error: 'Failed to fetch promo texts' }, { status: 500 })
  }
}