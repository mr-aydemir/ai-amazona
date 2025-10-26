#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'
import { slugify } from '../src/lib/slugify'

const prisma = new PrismaClient()

async function uniqueCategoryTranslationSlug(name: string, locale: string) {
  const base = slugify(name) || 'kategori'
  let candidate = base
  let i = 2
  while (true) {
    const exists = await prisma.categoryTranslation.count({ where: { locale, slug: candidate } })
    if (exists === 0) return candidate
    candidate = `${base}-${i}`
    i++
  }
}

async function backfillCategoryTranslationSlugs() {
  console.log('🔍 Kategori çeviri slug backfill başlıyor...')
  const translations = await prisma.categoryTranslation.findMany({
    select: { id: true, locale: true, name: true, slug: true }
  })
  let updated = 0
  for (const t of translations) {
    const name = t.name || ''
    const needs = !t.slug || t.slug.trim().length === 0
    if (!needs) continue
    const s = await uniqueCategoryTranslationSlug(name, t.locale)
    await prisma.categoryTranslation.update({
      where: { id: t.id },
      data: { slug: s }
    })
    updated++
    console.log(`  ✓ ${t.locale} -> ${name} | ${s}`)
  }
  console.log(`🎉 Tamamlandı. Güncellenen slug sayısı: ${updated}`)
}

backfillCategoryTranslationSlugs()
  .catch((err) => {
    console.error('❌ Hata:', err)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })