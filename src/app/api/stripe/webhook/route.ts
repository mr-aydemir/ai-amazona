import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const payload = await req.text()
  const sig = (req as any).headers?.get('stripe-signature') || ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid signature', message: err?.message }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    const orderId = String(intent.metadata?.orderId || '')
    const couponId = intent.metadata?.couponId ? String(intent.metadata.couponId) : null
    const discount = intent.metadata?.discount ? parseFloat(String(intent.metadata.discount)) : 0
    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
      if (order && !order.paidAt) {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({ where: { id: orderId }, data: { status: 'PAID', stripePaymentId: intent.id, paidAt: new Date() } })
          for (const item of (order.items || [])) {
            await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })
          }
          if (couponId && discount > 0) {
            await tx.couponRedemption.create({ data: { couponId, userId: order.userId, orderId, discountApplied: discount } })
          }
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
