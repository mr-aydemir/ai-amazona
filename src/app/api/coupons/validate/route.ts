import { NextResponse } from 'next/server'
import { validateCoupon, applyAmountOrPercent, applyBogo } from '@/lib/coupons'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({ code: '', cart: { items: [] } }))
  const v = await validateCoupon(String(body.code || ''))
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  const coupon = v.coupon!
  if (coupon.discountType === 'AMOUNT' || coupon.discountType === 'PERCENT') {
    const { discount } = applyAmountOrPercent(coupon, body.cart)
    return NextResponse.json({ ok: true, discount })
  }
  if (coupon.discountType === 'BOGO') {
    const { discount } = applyBogo(coupon, body.cart)
    return NextResponse.json({ ok: true, discount })
  }
  return NextResponse.json({ ok: true, discount: 0 })
}
