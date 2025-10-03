import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { renderEmailTemplate } from '@/lib/email'

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_USE_TLS === 'true',
  auth: {
    user: process.env.EMAIL_HOST_USER,
    pass: process.env.EMAIL_HOST_PASSWORD,
  },
})

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { message: 'E-posta adresi gereklidir.' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.' },
        { status: 404 }
      )
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'E-posta adresi zaten doğrulanmış.' },
        { status: 400 }
      )
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Update user with new verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry
      }
    } as any)

    // Create verification URL
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`

    const html = await renderEmailTemplate('tr', 'verify-email', { verificationUrl, userEmail: email })
    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'E-posta Adresinizi Doğrulayın - Hivhestin',
      html
    }

    // Send email
    await transporter.sendMail(mailOptions)

    return NextResponse.json(
      {
        message: 'Doğrulama e-postası yeniden gönderildi. Lütfen gelen kutunuzu kontrol edin.',
        success: true
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Resend verification email error:', error)
    return NextResponse.json(
      { message: 'E-posta gönderilirken bir hata oluştu. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}