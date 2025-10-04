import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateLanguageSchema = z.object({
  locale: z.enum(['tr', 'en']),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { locale } = updateLanguageSchema.parse(body)

    // Update user's preferred locale
    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferredLocale: locale },
    })

    return NextResponse.json({
      success: true,
      message: 'Language preference updated successfully',
      locale
    })
  } catch (error) {
    console.error('Error updating language preference:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid locale. Must be "tr" or "en"' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferredLocale: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      locale: user.preferredLocale || 'tr'
    })
  } catch (error) {
    console.error('Error fetching language preference:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}