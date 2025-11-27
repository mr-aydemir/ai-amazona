import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const coupon = await prisma.coupon.findUnique({ where: { id }, include: { rules: true } })
  if (!coupon) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })
  return NextResponse.json(coupon)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: any = { ...body }
  if (typeof body.code === 'string') data.code = body.code.trim().toUpperCase()
  if (body.startsAt) data.startsAt = new Date(body.startsAt)
  if (body.endsAt) data.endsAt = new Date(body.endsAt)
  const updated = await prisma.coupon.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.coupon.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Add or replace rules for a coupon
  const { id } = await params
  const body = await req.json().catch(() => ({ rules: [] }))
  const rules = Array.isArray(body.rules) ? body.rules : []
  await prisma.couponRule.deleteMany({ where: { couponId: id } })
  if (rules.length) {
    await prisma.couponRule.createMany({ data: rules.map((r: any) => ({
      couponId: id,
      scopeType: r.scopeType,
      scopeValueId: r.scopeValueId ?? null,
      minQty: r.minQty ?? null,
      minAmount: r.minAmount ?? null,
      group: r.group ?? null,
      groupOp: r.groupOp ?? null,
      bogoBuyQty: r.bogoBuyQty ?? null,
      bogoGetQty: r.bogoGetQty ?? null,
      bogoSameItemOnly: r.bogoSameItemOnly ?? false,
      bogoTargetScope: r.bogoTargetScope ?? null,
    })) })
  }
  const coupon = await prisma.coupon.findUnique({ where: { id }, include: { rules: true } })
  return NextResponse.json(coupon)
}
