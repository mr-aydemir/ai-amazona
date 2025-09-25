import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { message: 'Doğrulama kodu gereklidir.' },
        { status: 400 }
      )
    }

    // First, check if there's a user with this token (regardless of expiry)
    const userWithToken = await prisma.user.findFirst({
      where: {
        verificationToken: token
      }
    } as any)

    // If no user found with this token, check if there's a user with null token (already verified)
    if (!userWithToken) {
      // Check if this token was used before (user might be already verified)
      // We can't directly check this, so we'll return invalid token message
      return NextResponse.json(
        { message: 'Geçersiz doğrulama kodu.' },
        { status: 400 }
      )
    }

    // Check if user's email is already verified
    if (userWithToken.emailVerified) {
      return NextResponse.json(
        {
          message: 'Bu e-posta adresi zaten doğrulanmış. Giriş yapabilirsiniz.',
          alreadyVerified: true
        },
        { status: 200 }
      )
    }

    // Check if token is expired
    if (userWithToken.verificationTokenExpiry && userWithToken.verificationTokenExpiry <= new Date()) {
      return NextResponse.json(
        { message: 'Doğrulama kodunun süresi dolmuş.' },
        { status: 400 }
      )
    }

    // Update user to mark email as verified and clear verification token
    await prisma.user.update({
      where: { id: userWithToken.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpiry: null
      }
    } as any)

    return NextResponse.json(
      {
        message: 'E-posta adresiniz başarıyla doğrulandı. Artık giriş yapabilirsiniz.',
        success: true
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { message: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { message: 'Doğrulama kodu gereklidir.' },
        { status: 400 }
      )
    }

    // First, check if there's a user with this token (regardless of expiry)
    const userWithToken = await prisma.user.findFirst({
      where: {
        verificationToken: token
      }
    } as any)

    // If no user found with this token, check if there's a user with null token (already verified)
    if (!userWithToken) {
      // Check if this token was used before (user might be already verified)
      // We can't directly check this, so we'll return invalid token message
      return NextResponse.json(
        { message: 'Geçersiz doğrulama kodu.' },
        { status: 400 }
      )
    }

    // Check if user's email is already verified
    if (userWithToken.emailVerified) {
      return NextResponse.json(
        {
          message: 'Bu e-posta adresi zaten doğrulanmış. Giriş yapabilirsiniz.',
          alreadyVerified: true
        },
        { status: 200 }
      )
    }

    // Check if token is expired
    if (userWithToken.verificationTokenExpiry && userWithToken.verificationTokenExpiry <= new Date()) {
      return NextResponse.json(
        { message: 'Doğrulama kodunun süresi dolmuş.' },
        { status: 400 }
      )
    }

    // Update user to mark email as verified and clear verification token
    await prisma.user.update({
      where: { id: userWithToken.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpiry: null
      }
    } as any)

    return NextResponse.json(
      {
        message: 'E-posta adresiniz başarıyla doğrulandı. Artık giriş yapabilirsiniz.',
        success: true
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { message: 'Sunucu hatası. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}