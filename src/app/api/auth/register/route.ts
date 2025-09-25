import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

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
    const { name, email, password } = await request.json()

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
        emailVerified: null // Email not verified yet
      }
    } as any)

    // Create verification URL
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`

    // Send verification email
    try {
      await transporter.sendMail({
        from: `"Hivhestin" <${process.env.EMAIL_HOST_USER}>`,
        to: email,
        subject: 'E-posta Adresinizi Doğrulayın - Hivhestin',
        html: `
          <!DOCTYPE html>
          <html lang="tr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>E-posta Doğrulama - Hivhestin</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                  ✉️ E-posta Doğrulama
                </h1>
                <p style="color: #e8f0fe; margin: 10px 0 0 0; font-size: 16px;">
                  Hivhestin'e hoş geldiniz!
                </p>
              </div>

              <!-- Content -->
              <div style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <p style="color: #333333; font-size: 18px; margin: 0 0 10px 0; line-height: 1.5;">
                    Merhaba ${name},
                  </p>
                  <p style="color: #666666; font-size: 16px; margin: 0; line-height: 1.6;">
                    Hivhestin'e kayıt olduğunuz için teşekkür ederiz! Hesabınızı aktifleştirmek için e-posta adresinizi doğrulamanız gerekiyor.
                  </p>
                </div>

                <!-- Verification Button -->
                <div style="text-align: center; margin: 40px 0;">
                  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 12px; border: 2px dashed #e9ecef;">
                    <p style="color: #495057; margin: 0 0 25px 0; font-size: 16px;">
                      E-posta adresinizi doğrulamak için aşağıdaki butona tıklayın:
                    </p>
                    <a href="${verificationUrl}" 
                       style="display: inline-block; 
                              background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                              color: #ffffff; 
                              padding: 15px 40px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              font-weight: bold; 
                              font-size: 16px;
                              box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
                              transition: all 0.3s ease;">
                      ✅ E-postamı Doğrula
                    </a>
                  </div>
                </div>

                <!-- Security Info -->
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <div style="display: flex; align-items: flex-start;">
                    <div style="margin-right: 15px; font-size: 20px;">⚠️</div>
                    <div>
                      <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">Önemli Bilgi</h3>
                      <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.5;">
                        Bu doğrulama linki 24 saat geçerlidir. Eğer bu e-postayı siz talep etmediyseniz, güvenle görmezden gelebilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Alternative Link -->
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                  <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">
                    Buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırın:
                  </p>
                  <p style="color: #007bff; font-size: 12px; word-break: break-all; margin: 0;">
                    ${verificationUrl}
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                <p style="color: #6c757d; font-size: 12px; margin: 0;">
                  Bu e-posta Hivhestin tarafından gönderilmiştir.<br>
                © 2025 Hivhestin. Tüm hakları saklıdır.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
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