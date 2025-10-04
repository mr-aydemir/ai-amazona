import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findFirst()
    const baseCurrency = setting?.baseCurrency || 'TRY'
    const rates = await prisma.exchangeRate.findMany({ orderBy: { code: 'asc' } })
    return NextResponse.json({ baseCurrency, rates })
  } catch (error) {
    console.error('Public Currency GET error:', error)
    return NextResponse.json({ error: 'Failed to load currency info' }, { status: 500 })
  }
}