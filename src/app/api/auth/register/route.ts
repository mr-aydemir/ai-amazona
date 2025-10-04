import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
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
    const { name, email, password, locale } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Tüm alanlar gereklidir.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Şifre en az 6 karakter olmalıdır.' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Lütfen geçerli bir e-posta adresi girin.' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Bu e-posta adresi zaten kullanılıyor.' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 12)

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Create user with verification token (email not verified yet)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER',
        verificationToken,
        verificationTokenExpiry,
        emailVerified: null, // Email not verified yet
        // store user's preferred locale at registration if provided
        preferredLocale: locale === 'en' ? 'en' : 'tr'
      }
    } as any)

    // Create verification URL
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`

    // Send verification email
    try {
      // Prefer provided locale at registration; fallback to DB value or 'tr'
      const dbLocale = await getUserPreferredLocaleByEmail(email)
      const userLocale = locale === 'en' ? 'en' : (locale === 'tr' ? 'tr' : dbLocale)

      const html = await renderEmailTemplate(userLocale, 'verify-email', { verificationUrl, userEmail: email })
      const subject = userLocale === 'en' ? 'Verify Your Email Address - Hivhestin' : 'E-posta Adresinizi Doğrulayın - Hivhestin'

      await transporter.sendMail({
        from: `"Hivhestin" <${process.env.EMAIL_HOST_USER}>`,
        to: email,
        subject,
        html
      })

      return NextResponse.json(
        {
          message: 'Hesabınız oluşturuldu. Lütfen e-posta adresinizi doğrulamak için gelen kutunuzu kontrol edin.',
          requiresVerification: true
        },
        { status: 201 }
      )

    } catch (emailError) {
      console.error('Email sending error:', emailError)

      // If email fails, delete the user to prevent orphaned accounts
      await prisma.user.delete({
        where: { id: user.id }
      })

      return NextResponse.json(
        { message: 'E-posta gönderilirken hata oluştu. Lütfen tekrar deneyin.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}