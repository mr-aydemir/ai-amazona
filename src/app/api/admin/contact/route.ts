import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

function isAdmin(session: any) {
  return session?.user && session.user.role === 'ADMIN'
}

export async function GET() {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let contact = await prisma.contactInfo.findFirst({ include: { translations: true } })
    if (!contact) {
      // Create an empty record to simplify admin editing flow
      contact = await prisma.contactInfo.create({ data: {}, include: { translations: true } })
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('[ADMIN_CONTACT_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch contact info' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, companyName, phone, email, iban, taxNumber, mernisNumber, mapEmbed, translations } = body || {}

    let contact = await prisma.contactInfo.findFirst({})
    if (!contact) {
      contact = await prisma.contactInfo.create({ data: {} })
    }

    const updated = await prisma.contactInfo.update({
      where: { id: id || contact.id },
      data: {
        ...(companyName !== undefined ? { companyName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(iban !== undefined ? { iban } : {}),
        ...(taxNumber !== undefined ? { taxNumber } : {}),
        ...(mernisNumber !== undefined ? { mernisNumber } : {}),
        ...(mapEmbed !== undefined ? { mapEmbed } : {}),
      },
      include: { translations: true },
    })

    if (Array.isArray(translations)) {
      for (const t of translations) {
        if (!t?.locale) continue
        const address = typeof t.address === 'string' ? t.address : null
        await prisma.contactInfoTranslation.upsert({
          where: { contactInfoId_locale: { contactInfoId: updated.id, locale: t.locale } },
          update: { address },
          create: { contactInfoId: updated.id, locale: t.locale, address },
        })
      }
    }

    const result = await prisma.contactInfo.findUnique({
      where: { id: updated.id },
      include: { translations: true },
    })

    return NextResponse.json({ contact: result })
  } catch (error) {
    console.error('[ADMIN_CONTACT_PUT] Error:', error)
    return NextResponse.json({ error: 'Failed to update contact info' }, { status: 500 })
  }
}