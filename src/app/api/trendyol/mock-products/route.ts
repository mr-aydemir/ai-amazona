import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'trendyol-products-2025-10-09T21-17-44-876Z.json')
    const text = await fs.readFile(filePath, 'utf-8')
    const json = JSON.parse(text)
    return NextResponse.json(json, { status: 200 })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Mock data read failed', details: err?.message },
      { status: 500 }
    )
  }
}