import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: { locale: string } }) {
  try {
    const locale = params.locale
    const contact = await prisma.contactInfo.findFirst({
      include: { translations: { where: { locale } } },
      orderBy: { createdAt: 'asc' },
    })

    if (!contact) {
      return NextResponse.json({ contact: null })
    }

    const t = contact.translations?.[0]
    return NextResponse.json({
      contact: {
        id: contact.id,
        companyName: (contact as any).companyName ?? null,
        phone: contact.phone,
        email: contact.email,
        iban: contact.iban,
        taxNumber: contact.taxNumber,
        mernisNumber: contact.mernisNumber,
        mapEmbed: contact.mapEmbed,
        address: t?.address || null,
      },
    })
  } catch (error) {
    console.error('[CONTACT_PUBLIC_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch contact info' }, { status: 500 })
  }
}