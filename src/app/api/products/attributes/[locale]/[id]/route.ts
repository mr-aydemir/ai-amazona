import { NextRequest, NextResponse } from 'next/server'
import { getProductAttributes } from '@/lib/eav'

interface RouteParams {
  params: Promise<{ locale: string; id: string }>
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { locale, id } = await params
    if (!locale || !id) {
      return NextResponse.json({ error: 'Locale ve ürün id gereklidir' }, { status: 400 })
    }

    const attributes = await getProductAttributes(id, locale)
    return NextResponse.json({ productId: id, attributes })
  } catch (error) {
    console.error('Product attributes fetch error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}