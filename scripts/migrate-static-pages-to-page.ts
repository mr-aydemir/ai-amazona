#!/usr/bin/env tsx
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

function hasFlag(...names: string[]): boolean {
  return process.argv.some((arg) => names.includes(arg))
}

function normalizeLocale(locale?: string | null) {
  if (!locale) return ''
  return locale.split('-')[0]
}

async function upsertPage(slug: string) {
  return prisma.page.upsert({
    where: { slug },
    update: {},
    create: { slug },
  })
}

async function ensurePage(slug: string) {
  const page = await upsertPage(slug)
  const count = await prisma.pageTranslation.count({ where: { pageId: page.id } })
  return { page: slug, created: true, translations: count }
}

async function migrateAbout(dryRun: boolean) {
  return ensurePage('about')
}

async function migratePrivacy(dryRun: boolean) {
  return ensurePage('privacy')
}

async function migrateCookies(dryRun: boolean) {
  return ensurePage('cookies')
}

async function migrateTerms(dryRun: boolean) {
  return ensurePage('terms')
}

async function migrateDistanceSales(dryRun: boolean) {
  return ensurePage('distance-sales')
}

async function migrateReturnPolicy(dryRun: boolean) {
  return ensurePage('return-policy')
}

async function main() {
  const dryRun = hasFlag('--dry-run')
  const yes = hasFlag('--yes')

  console.log(`[pages:migrate] Starting migration ${dryRun ? '(dry-run)' : ''}`)
  if (!dryRun && !yes) {
    console.error('[pages:migrate] Missing --yes flag for execution. Use --dry-run to preview.')
    process.exit(1)
  }

  const tasks = [
    migrateAbout(dryRun),
    migratePrivacy(dryRun),
    migrateCookies(dryRun),
    migrateTerms(dryRun),
    migrateDistanceSales(dryRun),
    migrateReturnPolicy(dryRun),
  ]

  const results = await Promise.all(tasks)
  for (const r of results) {
    console.log(`- ${r.page}: ${r.translations} translations present`)
  }

  console.log(`[pages:migrate] Completed.`)
}

main()
  .catch((e) => {
    console.error('[pages:migrate] Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    try { await prisma.$disconnect() } catch { }
  })