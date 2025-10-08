import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, subject, message, locale } = body || {}

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'İsim, e-posta ve mesaj zorunludur' }, { status: 400 })
    }

    const saved = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
        locale: locale || null,
      },
    })

    return NextResponse.json({ ok: true, id: saved.id })
  } catch (error) {
    console.error('[CONTACT_FORM_POST] Error:', error)
    return NextResponse.json({ error: 'Mesaj gönderilemedi' }, { status: 500 })
  }
}