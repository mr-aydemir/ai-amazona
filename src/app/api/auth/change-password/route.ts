import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendEmail } from '@/lib/email'
import { passwordResetSuccessTemplate } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'CURRENT_AND_NEW_PASSWORD_REQUIRED' },
        { status: 400 }
      )
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'PASSWORD_MIN_LENGTH' },
        { status: 400 }
      )
    }

    // Fetch user and verify current password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, password: true, preferredLocale: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
    }

    if (!user.password) {
      // Account without password (e.g. OAuth-only). Block change via this endpoint.
      return NextResponse.json(
        { error: 'PASSWORD_NOT_SET' },
        { status: 400 }
      )
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'INVALID_CURRENT_PASSWORD' },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      } as any,
    })

    // Send confirmation email (non-blocking)
    try {
      if (user.email) {
        // Template expects a string email; passing an object here causes "[object Object]"
        const html = passwordResetSuccessTemplate(user.email || '')
        await sendEmail({
          to: user.email,
          subject:
            user.preferredLocale === 'en'
              ? 'Your password has been changed'
              : 'Şifreniz başarıyla değiştirildi',
          html,
        })
      }
    } catch (e) {
      // Do not fail the password change if email sending fails
      console.warn('Password change email send failed:', e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    )
  }
}