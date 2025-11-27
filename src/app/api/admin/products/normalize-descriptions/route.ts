import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

function normalizeNewlines(input: string | null | undefined): string {
  if (typeof input !== 'string') return ''
  let s = input.replace(/\r/g, '')
  // Collapse 2+ blank lines to a single newline
  s = s.replace(/(\n\s*){2,}/g, '\n')
  // Also collapse repeated <br> to single, in case HTML was stored
  s = s.replace(/(<br\s*\/?>\s*){2,}/gi, '<br/>')
  return s
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Bu işlem için admin yetkisi gerekiyor' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body?.productIds) ? body.productIds.map((x: any) => String(x)) : []

  let updated = 0
  let touched = 0

  if (ids.length > 0) {
    const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, description: true } })
    for (const p of products) {
      const norm = normalizeNewlines(p.description)
      if (norm !== (p.description || '')) {
        await prisma.product.update({ where: { id: p.id }, data: { description: norm } })
        updated++
      }
      touched++
      const translations = await prisma.productTranslation.findMany({ where: { productId: p.id }, select: { locale: true, description: true } })
      for (const t of translations) {
        const n2 = normalizeNewlines(t.description)
        if (n2 !== (t.description || '')) {
          await prisma.productTranslation.update({ where: { productId_locale: { productId: p.id, locale: t.locale } }, data: { description: n2 } })
          updated++
        }
      }
    }
  } else {
    // Process all products in batches
    const batch = 500
    let skip = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const products = await prisma.product.findMany({ select: { id: true, description: true }, skip, take: batch, orderBy: { id: 'asc' } })
      if (products.length === 0) break
      for (const p of products) {
        const norm = normalizeNewlines(p.description)
        if (norm !== (p.description || '')) {
          await prisma.product.update({ where: { id: p.id }, data: { description: norm } })
          updated++
        }
        touched++
        const translations = await prisma.productTranslation.findMany({ where: { productId: p.id }, select: { locale: true, description: true } })
        for (const t of translations) {
          const n2 = normalizeNewlines(t.description)
          if (n2 !== (t.description || '')) {
            await prisma.productTranslation.update({ where: { productId_locale: { productId: p.id, locale: t.locale } }, data: { description: n2 } })
            updated++
          }
        }
      }
      skip += products.length
    }
  }

  return NextResponse.json({ ok: true, updated, touched })
}

