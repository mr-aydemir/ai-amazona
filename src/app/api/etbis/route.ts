import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { DEFAULT_ETBIS_URL } from '@/lib/etbis-constants'
import { generateEtbisQr } from '@/lib/etbis-qr'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findFirst()
    if (!setting) {
      return NextResponse.json({ etbisUrl: DEFAULT_ETBIS_URL, etbisQrImage: null })
    }

    const etbisUrl = setting.etbisUrl || DEFAULT_ETBIS_URL
    if (setting.etbisQrImage) {
      return NextResponse.json({ etbisUrl, etbisQrImage: setting.etbisQrImage })
    }

    // Generate lazily for records created before this feature existed.
    const etbisQrImage = await generateEtbisQr(etbisUrl)
    await prisma.systemSetting
      .update({ where: { id: setting.id }, data: { etbisQrImage } })
      .catch(() => null)

    return NextResponse.json({ etbisUrl, etbisQrImage })
  } catch (error) {
    console.error('[ETBIS_GET] Error:', error)
    return NextResponse.json({ etbisUrl: DEFAULT_ETBIS_URL, etbisQrImage: null })
  }
}
