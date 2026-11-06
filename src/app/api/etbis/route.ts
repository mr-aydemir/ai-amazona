import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { DEFAULT_ETBIS_URL } from '@/lib/etbis-constants'
import { generateEtbisQr } from '@/lib/etbis-qr'

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
}

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findFirst()
    if (!setting) {
      return NextResponse.json(
        { etbisUrl: DEFAULT_ETBIS_URL, etbisQrImage: null },
        { headers: CACHE_HEADERS }
      )
    }

    const etbisUrl = setting.etbisUrl || DEFAULT_ETBIS_URL
    if (setting.etbisQrImage) {
      return NextResponse.json(
        { etbisUrl, etbisQrImage: setting.etbisQrImage },
        { headers: CACHE_HEADERS }
      )
    }

    // Generate lazily for records created before this feature existed.
    const etbisQrImage = await generateEtbisQr(etbisUrl)
    await prisma.systemSetting
      .update({ where: { id: setting.id }, data: { etbisQrImage } })
      .catch(() => null)

    return NextResponse.json({ etbisUrl, etbisQrImage }, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('[ETBIS_GET] Error:', error)
    return NextResponse.json({ etbisUrl: DEFAULT_ETBIS_URL, etbisQrImage: null })
  }
}
