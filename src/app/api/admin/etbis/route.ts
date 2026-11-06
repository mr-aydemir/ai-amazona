import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { DEFAULT_ETBIS_URL } from '@/lib/etbis-constants'
import { generateEtbisQr, isValidHttpUrl } from '@/lib/etbis-qr'

function isAdmin(session: any) {
  return session?.user && session.user.role === 'ADMIN'
}

export async function GET() {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let setting = await prisma.systemSetting.findFirst()
    if (!setting) {
      setting = await prisma.systemSetting.create({ data: {} })
    }

    const etbisUrl = setting.etbisUrl || DEFAULT_ETBIS_URL
    let etbisQrImage = setting.etbisQrImage
    if (!etbisQrImage) {
      etbisQrImage = await generateEtbisQr(etbisUrl)
      await prisma.systemSetting.update({
        where: { id: setting.id },
        data: { etbisQrImage },
      })
    }

    return NextResponse.json({ etbisUrl, etbisQrImage })
  } catch (error) {
    console.error('[ADMIN_ETBIS_GET] Error:', error)
    return NextResponse.json({ error: 'Failed to load ETBİS settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const etbisUrl = typeof body?.etbisUrl === 'string' ? body.etbisUrl.trim() : ''

    if (!isValidHttpUrl(etbisUrl)) {
      return NextResponse.json({ error: 'Invalid ETBİS URL' }, { status: 400 })
    }

    const etbisQrImage = await generateEtbisQr(etbisUrl)

    const existing = await prisma.systemSetting.findFirst()
    const setting = existing
      ? await prisma.systemSetting.update({
          where: { id: existing.id },
          data: { etbisUrl, etbisQrImage },
        })
      : await prisma.systemSetting.create({
          data: { etbisUrl, etbisQrImage },
        })

    return NextResponse.json({
      etbisUrl: setting.etbisUrl,
      etbisQrImage: setting.etbisQrImage,
    })
  } catch (error) {
    console.error('[ADMIN_ETBIS_PUT] Error:', error)
    return NextResponse.json({ error: 'Failed to update ETBİS settings' }, { status: 500 })
  }
}
