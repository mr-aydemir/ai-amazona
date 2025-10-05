import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferredLocale: true },
    })

    // Fallback to system base currency if user not found
    const settings = await prisma.systemSetting.findFirst({
      select: { baseCurrency: true },
    })

    const inferred = user?.preferredLocale === 'en' ? 'USD' : (settings?.baseCurrency || 'TRY')
    return NextResponse.json({ currency: inferred })
  } catch (error) {
    console.error('Error fetching currency preference:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  return NextResponse.json({ error: 'Currency preference update not supported on this setup' }, { status: 501 })
}