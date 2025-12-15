import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { code: 'TOKEN_REQUIRED' },
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
      // Token is invalid or already used
      return NextResponse.json(
        { code: 'INVALID_TOKEN' },
        { status: 400 }
      )
    }

    // Check if user's email is already verified
    if (userWithToken.emailVerified) {
      return NextResponse.json(
        {
          code: 'ALREADY_VERIFIED',
          alreadyVerified: true
        },
        { status: 200 }
      )
    }

    // Check if token is expired
    if (userWithToken.verificationTokenExpiry && userWithToken.verificationTokenExpiry <= new Date()) {
      return NextResponse.json(
        { code: 'TOKEN_EXPIRED' },
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
        code: 'SUCCESS',
        success: true
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR' },
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
        { code: 'TOKEN_REQUIRED' },
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
      // Token is invalid or already used
      return NextResponse.json(
        { code: 'INVALID_TOKEN' },
        { status: 400 }
      )
    }

    // Check if user's email is already verified
    if (userWithToken.emailVerified) {
      return NextResponse.json(
        {
          code: 'ALREADY_VERIFIED',
          alreadyVerified: true
        },
        { status: 200 }
      )
    }

    // Check if token is expired
    if (userWithToken.verificationTokenExpiry && userWithToken.verificationTokenExpiry <= new Date()) {
      return NextResponse.json(
        { code: 'TOKEN_EXPIRED' },
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
        code: 'SUCCESS',
        success: true
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}