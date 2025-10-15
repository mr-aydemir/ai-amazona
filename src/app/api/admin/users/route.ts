import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import * as z from 'zod'

const isAdmin = (session: any) => !!session?.user && session.user.role === 'ADMIN'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roleParam = (searchParams.get('role') || 'ALL').toUpperCase()
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (roleParam !== 'ALL') {
      if (!['ADMIN', 'STAFF', 'USER'].includes(roleParam)) {
        return NextResponse.json({ error: 'Invalid role filter' }, { status: 400 })
      }
      where.role = roleParam
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const total = await prisma.user.count({ where })
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: { select: { total: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    } as any)

    return NextResponse.json({ total, page, limit, users })
  } catch (error) {
    console.error('[ADMIN_USERS_GET] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'STAFF', 'USER']),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { userId, role } = parsed.data

    // Prevent demoting self accidentally if desired; allow for now

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('[ADMIN_USERS_PATCH] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}