import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { UAParser } from 'ua-parser-js'

const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const MAX_DURATION_SECONDS = 60 * 60

function headerValue(req: Request, name: string) {
  const value = req.headers.get(name)
  return value && value.trim() ? value.trim() : undefined
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const event = body?.event === 'PAGE_LEAVE' ? 'PAGE_LEAVE' : 'PAGE_VIEW'
    const url = typeof body?.url === 'string' ? body.url.slice(0, 500) : '/'
    const duration = Math.min(
      MAX_DURATION_SECONDS,
      Math.max(0, Math.round(Number(body?.duration) || 0))
    )

    const cookieStore = await cookies()
    let visitorId = cookieStore.get('visitor_id')?.value
    if (!visitorId) visitorId = crypto.randomUUID()

    let session = await prisma.analyticsSession.findFirst({
      where: { visitorId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, updatedAt: true },
    })

    if (!session || Date.now() - session.updatedAt.getTime() > SESSION_TIMEOUT_MS) {
      if (event !== 'PAGE_VIEW') {
        return NextResponse.json({ success: true, visitorId })
      }

      const parser = new UAParser(body?.userAgent)
      const forwardedFor = req.headers.get('x-forwarded-for')
      const finalIp = forwardedFor ? forwardedFor.split(',')[0].trim() : headerValue(req, 'x-real-ip')

      const latitudeHeader = headerValue(req, 'x-vercel-ip-latitude')
      const longitudeHeader = headerValue(req, 'x-vercel-ip-longitude')
      const cityHeader = headerValue(req, 'x-vercel-ip-city')

      session = await prisma.analyticsSession.create({
        data: {
          visitorId,
          userAgent: typeof body?.userAgent === 'string' ? body.userAgent : undefined,
          referrer: typeof body?.referrer === 'string' ? body.referrer : undefined,
          ipAddress: finalIp,
          country: headerValue(req, 'x-vercel-ip-country'),
          city: cityHeader ? decodeURIComponent(cityHeader) : undefined,
          latitude: latitudeHeader ? Number(latitudeHeader) : undefined,
          longitude: longitudeHeader ? Number(longitudeHeader) : undefined,
          device:
            parser.getDevice().type || (Number(body?.width) < 768 ? 'mobile' : 'desktop'),
          browser: parser.getBrowser().name,
          os: parser.getOS().name,
        },
        select: { id: true, updatedAt: true },
      })
    }

    if (event === 'PAGE_LEAVE') {
      if (duration > 0) {
        const lastView = await prisma.analyticsPageView.findFirst({
          where: { sessionId: session.id, path: url },
          orderBy: { createdAt: 'desc' },
          select: { id: true, duration: true },
        })

        if (lastView) {
          await prisma.analyticsPageView.update({
            where: { id: lastView.id },
            data: { duration: Math.max(lastView.duration || 0, duration) },
          })
        }
      }

      return NextResponse.json({ success: true, visitorId })
    }

    let finalProductId: string | undefined =
      typeof body?.productId === 'string' ? body.productId : undefined

    if (!finalProductId) {
      const match = url.match(/\/products?\/([^/?#]+)/)
      if (match?.[1]) {
        const slug = decodeURIComponent(match[1])
        const product = await prisma.product.findUnique({
          where: { slug },
          select: { id: true },
        })
        if (product) finalProductId = product.id
      }
    }

    await prisma.analyticsSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    })

    await prisma.analyticsPageView.create({
      data: {
        sessionId: session.id,
        path: url,
        title: typeof body?.title === 'string' ? body.title.slice(0, 300) : undefined,
        productId: finalProductId || null,
        duration: 0,
      },
    })

    const response = NextResponse.json({ success: true, visitorId })
    if (!cookieStore.get('visitor_id')) {
      response.cookies.set('visitor_id', visitorId, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      })
    }
    return response
  } catch (error) {
    console.error('Analytics Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
