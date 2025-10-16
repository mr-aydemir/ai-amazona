'use server'

import { NextResponse } from 'next/server'

// Static cargo providers table per user’s specification
const STATIC_PROVIDERS: Array<{ id: number, code: string, name: string, taxNumber: string }> = [
  { id: 38, code: 'SENDEOMP', name: 'Kolay Gelsin Marketplace', taxNumber: '2910804196' },
  { id: 30, code: 'BORMP', name: 'Borusan Lojistik Marketplace', taxNumber: '1800038254' },
  { id: 10, code: 'DHLECOMMP', name: 'DHL eCommerce Marketplace', taxNumber: '6080712084' },
  { id: 19, code: 'PTTMP', name: 'PTT Kargo Marketplace', taxNumber: '7320068060' },
  { id: 9, code: 'SURATMP', name: 'Sürat Kargo Marketplace', taxNumber: '7870233582' },
  { id: 17, code: 'TEXMP', name: 'Trendyol Express Marketplace', taxNumber: '8590921777' },
  { id: 6, code: 'HOROZMP', name: 'Horoz Kargo Marketplace', taxNumber: '4630097122' },
  { id: 20, code: 'CEVAMP', name: 'CEVA Marketplace', taxNumber: '8450298557' },
  { id: 4, code: 'YKMP', name: 'Yurtiçi Kargo Marketplace', taxNumber: '3130557669' },
  { id: 7, code: 'ARASMP', name: 'Aras Kargo Marketplace', taxNumber: '720039666' },
]

export async function GET() {
  try {
    // Return in a normalized shape used by the admin UI
    const providers = STATIC_PROVIDERS.map(p => ({ id: p.id, code: p.code, name: p.name, taxNumber: p.taxNumber }))
    return NextResponse.json({ providers })
  } catch (error: any) {
    return NextResponse.json({ error: 'Sunucu hatası', message: error?.message ?? 'unknown error' }, { status: 500 })
  }
}