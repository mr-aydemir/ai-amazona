import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'MISSING_FIELDS',
          message: 'Email and password are required' 
        },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'INVALID_EMAIL_FORMAT',
          message: 'Please enter a valid email address' 
        },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'No account found with this email address' 
        },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'INVALID_PASSWORD',
          message: 'Incorrect password' 
        },
        { status: 401 }
      )
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      }
    })
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred. Please try again later.' 
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}