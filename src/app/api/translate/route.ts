import { NextRequest, NextResponse } from 'next/server'
import { translateToEnglish } from '@/lib/translate'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const text = typeof body?.text === 'string' ? body.text : ''
    if (!text.trim()) {
      return NextResponse.json({ error: 'Metin gerekli' }, { status: 400 })
    }
    const translated = await translateToEnglish(text)
    return NextResponse.json({ original: text, translated })
  } catch (e) {
    return NextResponse.json({ error: 'Sunucu hatası. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}