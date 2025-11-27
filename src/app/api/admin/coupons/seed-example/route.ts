import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  // Anahtarlık kategorisinde 100 TL indirim
  const amount = await prisma.coupon.create({
    data: {
      code: 'ANAHTARLIK100', status: 'ACTIVE', discountType: 'AMOUNT', amountFixed: 100, currency: 'TRY', maxDiscount: 100,
      rules: { create: [{ scopeType: 'CATEGORY', scopeValueId: 'ANAHTARLIK_CAT_ID' }] },
    },
  })
  // Bir alana bir bedava (aynı kategori)
  const bogo = await prisma.coupon.create({
    data: {
      code: 'BIRALBIRBEDAVA', status: 'ACTIVE', discountType: 'BOGO',
      rules: { create: [{ scopeType: 'CATEGORY', scopeValueId: 'ANAHTARLIK_CAT_ID', bogoBuyQty: 1, bogoGetQty: 1, bogoTargetScope: 'SAME_CATEGORY' }] },
    },
  })
  return NextResponse.json({ ok: true, amount, bogo })
}
