import { NextRequest, NextResponse } from 'next/server'
// cookies kullanılmıyor; para birimi client’tan body ile alınacak
import { iyzicoClient } from '@/lib/iyzico'
import { getCurrencyData, convertServer } from '@/lib/server-currency'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { price, binNumber, currency } = body

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Geçerli bir fiyat belirtiniz' },
        { status: 400 }
      )
    }

    // Seçili para birimi ile fiyatı dönüştür: body.currency öncelikli
    const { baseCurrency, rates } = await getCurrencyData()
    const rateCodes = new Set(rates.map(r => r.currency))
    const displayCurrency = (typeof currency === 'string' && rateCodes.has(currency)) ? currency : baseCurrency
    const convertedPrice = convertServer(price, baseCurrency, displayCurrency, rates)

    // İyzico taksit sorgulama API'sini çağır
    const installmentResponse = await iyzicoClient.queryInstallments({
      price: convertedPrice,
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