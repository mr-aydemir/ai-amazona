import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import prisma from '@/lib/prisma'

const EmailSchema = z.object({
  email: z.string().email()
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emails = await prisma.orderNotificationEmail.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(emails)
  } catch (error) {
    console.error('[ORDER_NOTIFY_EMAILS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email } = EmailSchema.parse(body)

    const created = await prisma.orderNotificationEmail.create({
      data: { email }
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('[ORDER_NOTIFY_EMAILS_POST]', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email } = EmailSchema.parse(body)

    const existing = await prisma.orderNotificationEmail.findUnique({ where: { email } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.orderNotificationEmail.delete({ where: { email } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ORDER_NOTIFY_EMAILS_DELETE]', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}