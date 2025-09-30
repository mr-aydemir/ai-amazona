import { NextRequest, NextResponse } from 'next/server'
import { iyzicoClient } from '@/lib/iyzico'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { binNumber } = body

    if (!binNumber || binNumber.length < 6) {
      return NextResponse.json(
        { error: 'Geçerli bir BIN numarası belirtiniz (en az 6 haneli)' },
        { status: 400 }
      )
    }

    // İyzico BIN sorgulama API'sini çağır
    const binResponse = await iyzicoClient.queryBin({
      binNumber: binNumber.substring(0, 6) // İlk 6 haneyi al
    })

    if (binResponse.status !== 'success') {
      return NextResponse.json(
        { error: 'BIN bilgileri alınamadı' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      binNumber: binResponse.binNumber,
      cardType: binResponse.cardType,
      cardAssociation: binResponse.cardAssociation,
      cardFamily: binResponse.cardFamily,
      bankName: binResponse.bankName,
      bankCode: binResponse.bankCode,
      commercial: binResponse.commercial
    })

  } catch (error) {
    console.error('BIN query error:', error)
    return NextResponse.json(
      { error: 'BIN sorgulama sırasında hata oluştu' },
      { status: 500 }
    )
  }
}