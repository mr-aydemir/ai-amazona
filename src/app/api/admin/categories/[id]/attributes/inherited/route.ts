import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getInheritedCategoryAttributes } from '@/lib/eav'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })

    const { id } = await params
    const locale = request.nextUrl.searchParams.get('locale') || 'tr'

    const items = await getInheritedCategoryAttributes(id, locale)
    return NextResponse.json(items)
  } catch (error) {
    console.error('Inherited attributes GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}