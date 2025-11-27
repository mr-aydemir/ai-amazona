import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const coupons = await prisma.coupon.findMany({ include: { rules: true }, orderBy: { updatedAt: 'desc' } })
  return NextResponse.json(coupons)
}

export async function POST(req: Request) {
  const contentType = (req as any).headers?.get('content-type') || ''
  let body: any = {}
  if (contentType.includes('application/json')) {
    body = await req.json().catch(() => ({}))
  } else {
    const fd = await req.formData().catch(() => null)
    if (fd) {
      body = Object.fromEntries(Array.from(fd.entries()))
    }
  }
  const code = String(body.code || '').trim().toUpperCase()
  if (!code) return NextResponse.json({ error: 'Kod gereklidir' }, { status: 400 })
  const parseDate = (v: any) => {
    if (!v) return null
    const d = new Date(String(v))
    return Number.isNaN(d.getTime()) ? null : d
  }
  try {
    const coupon = await prisma.coupon.create({
      data: {
        code,
        status: body.status || 'ACTIVE',
        discountType: body.discountType || 'AMOUNT',
        amountFixed: body.amountFixed !== undefined ? Number(body.amountFixed) : null,
        amountPercent: body.amountPercent !== undefined ? Number(body.amountPercent) : null,
        currency: body.currency ?? null,
        maxDiscount: body.maxDiscount !== undefined ? Number(body.maxDiscount) : null,
        usageLimit: body.usageLimit !== undefined ? Number(body.usageLimit) : null,
        perUserLimit: body.perUserLimit !== undefined ? Number(body.perUserLimit) : null,
        stackingPolicy: body.stackingPolicy || 'EXCLUSIVE',
        startsAt: parseDate(body.startsAt),
        endsAt: parseDate(body.endsAt),
      },
    })
    return NextResponse.json(coupon, { status: 201 })
  } catch (e: any) {
    const codeErr = e?.code
    if (codeErr === 'P2002') {
      return NextResponse.json({ error: 'Kod zaten mevcut' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
