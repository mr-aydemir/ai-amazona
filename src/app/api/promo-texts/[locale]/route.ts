import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: any
) {
  const locale: string = String(params?.locale ?? '')

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

    return NextResponse.json({ texts }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch promo texts:', error)
    return NextResponse.json({ error: 'Failed to fetch promo texts' }, { status: 500 })
  }
}