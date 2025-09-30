import { NextRequest, NextResponse } from 'next/server'
import { iyzicoClient } from '@/lib/iyzico'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { price, binNumber } = body

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Geçerli bir fiyat belirtiniz' },
        { status: 400 }
      )
    }

    // İyzico taksit sorgulama API'sini çağır
    const installmentResponse = await iyzicoClient.queryInstallments({
      price,
      binNumber: binNumber || undefined
    })

    if (installmentResponse.status !== 'success') {
      return NextResponse.json(
        { error: 'Taksit bilgileri alınamadı' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      installmentDetails: installmentResponse.installmentDetails
    })

  } catch (error) {
    console.error('Installment query error:', error)
    return NextResponse.json(
      { error: 'Taksit sorgulama sırasında hata oluştu' },
      { status: 500 }
    )
  }
}