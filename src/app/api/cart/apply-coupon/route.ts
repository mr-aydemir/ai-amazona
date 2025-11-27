import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateCoupon, applyAmountOrPercent, applyBogo } from '@/lib/coupons'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({ code: '', cart: { items: [] }, userId: null }))
  const v = await validateCoupon(String(body.code || ''))
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  const coupon = v.coupon!
  let discount = 0
  if (coupon.discountType === 'AMOUNT' || coupon.discountType === 'PERCENT') {
    discount = applyAmountOrPercent(coupon, body.cart).discount
  } else if (coupon.discountType === 'BOGO') {
    discount = applyBogo(coupon, body.cart).discount
  }
  // Return new totals; persistence to DB can be added when cart is server-side stored
  return NextResponse.json({ ok: true, discount, coupon: { id: coupon.id, code: coupon.code } })
}
