import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { renderEmailTemplate } from '@/lib/email'
import { getUserPreferredLocaleByEmail } from '@/lib/user-locale'

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_USE_TLS === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_HOST_USER,
    pass: process.env.EMAIL_HOST_PASSWORD,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { email, locale } = await request.json()

    if (!email) {
      return NextResponse.json(
        {
          error: 'Email address is required',
          success: false
        },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: 'Please enter a valid email address',
          success: false
        },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // For security reasons, always return success message
    // even if user doesn't exist to prevent email enumeration
    if (!user) {
      // Log for admin purposes but don't reveal to user
      console.log(`Password reset attempted for non-existent email: ${email}`)

      return NextResponse.json(
        {
          message: 'If an account with this email exists, you will receive a password reset link.',
          success: true
        },
        { status: 200 }
      )
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Save reset token to database
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry
      } as any
    })

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    // Send email
    try {
      // Prefer user's stored locale; if missing, fallback to provided locale
      const userLocale = (user?.preferredLocale as 'tr' | 'en') || (locale === 'en' ? 'en' : 'tr')

      const html = await renderEmailTemplate(userLocale, 'password-reset', { resetUrl, userEmail: email })
      const subject = userLocale === 'en' ? 'Password Reset Request - Hivhestın' : 'Şifre Sıfırlama Talebi - Hivhestın'

      await transporter.sendMail({
        from: `"Hivhestın" <${process.env.EMAIL_HOST_USER}>`,
        to: email,
        subject,
        html
      })

      return NextResponse.json(
        {
          message: 'Password reset email sent successfully',
          success: true
        },
        { status: 200 }
      )
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      return NextResponse.json(
        {
          error: 'Failed to send email. Please try again later.',
          success: false
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again later.',
        success: false
      },
      { status: 500 }
    )
  }
}