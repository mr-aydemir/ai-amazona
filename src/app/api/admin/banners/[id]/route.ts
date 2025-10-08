import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const banner = await prisma.banner.findUnique({
      where: { id },
      include: { translations: true },
    })

    if (!banner) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    return NextResponse.json({ banner })
  } catch (e) {
    console.error('Admin get banner by id error', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}