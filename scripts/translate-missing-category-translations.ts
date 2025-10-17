#!/usr/bin/env tsx
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { translate } from '@vitalets/google-translate-api'
import { HttpProxyAgent } from 'http-proxy-agent'
import { promises as fs } from 'fs'
import path from 'path'

function parseFlag(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(name + '='))
  return match ? match.split('=')[1] : undefined
}

function hasFlag(...names: string[]): boolean {
  return process.argv.some((arg) => names.includes(arg))
}

function normalizeProxy(raw: string | undefined | null): string | null {
  const val = String(raw ?? '').trim()
  if (!val) return null
  const withProtocol = val.startsWith('http://') || val.startsWith('https://') ? val : `http://${val}`
  try {
    new URL(withProtocol)
    return withProtocol
  } catch {
    return null
  }
}

let cachedProxies: string[] | null = null
let proxyCursor = 0
let lastListKey = ''

async function getProxies(): Promise<string[]> {
  if (cachedProxies) return cachedProxies
  try {
    const filePath = path.join(process.cwd(), 'proxies.txt')
    const text = await fs.readFile(filePath, 'utf-8')
    const lines = text
      .split(/\r?\n/)
      .map((l) => normalizeProxy(l))
      .filter((v): v is string => Boolean(v))
    cachedProxies = lines
    return lines
  } catch {
    cachedProxies = []
    return []
  }
}

async function getCombinedProxyList(): Promise<string[]> {
  const envProxy = normalizeProxy(process.env.TRANSLATE_PROXY_URL)
  const fileProxies = await getProxies()
  const set = new Set<string>()
  if (envProxy) set.add(envProxy)
  for (const p of fileProxies) set.add(p)
  const list = Array.from(set)
  const key = list.join('|')
  if (key !== lastListKey) {
    lastListKey = key
    if (proxyCursor >= list.length) proxyCursor = 0
  }
  return list
}

async function translateWithVitalets(text: string): Promise<string> {
  const list = await getCombinedProxyList()
  if (list.length === 0) return text
  const ordered = list.slice(proxyCursor).concat(list.slice(0, proxyCursor))
  for (let i = 0; i < ordered.length; i++) {
    const proxyUrl = ordered[i]
    try {
      const agent = new HttpProxyAgent(proxyUrl)
      const result = await translate(text, {
        from: 'tr',
        to: 'en',
        fetchOptions: { agent },
      })
      const translated = (result as any)?.text
      if (typeof translated === 'string' && translated.length > 0) {
        proxyCursor = (proxyCursor + i) % list.length
        return translated
      }
    } catch {
      continue
    }
  }
  proxyCursor = (proxyCursor + ordered.length) % list.length
  return text
}

async function translateToEnglish(text: string): Promise<string> {
  const input = (text || '').toString()
  if (!input.trim()) return ''
  try {
    return await translateWithVitalets(input)
  } catch {
    return input
  }
}

async function main() {
  const dryRun = hasFlag('--dry-run', '-n')
  const yes = hasFlag('--yes', '-y')
  const force = hasFlag('--force')
  const limitStr = parseFlag('--limit')
  const limit = limitStr ? Math.max(1, Number(limitStr)) : undefined

  console.log(`\n[Category Translate] Başlıyor | Dry-run: ${dryRun ? 'EVET' : 'HAYIR'} | Force: ${force ? 'EVET' : 'HAYIR'}${limit ? ` | Limit: ${limit}` : ''}`)

  const categories = await prisma.category.findMany({
    include: { translations: true },
    orderBy: { name: 'asc' },
  })

  const todo = categories.filter((cat) => {
    const en = cat.translations.find((t) => t.locale === 'en')
    return force || !en || !en.name || en.name.trim().length === 0
  })

  const total = limit ? Math.min(limit, todo.length) : todo.length
  if (total === 0) {
    console.log('[Category Translate] İşlenecek kategori bulunamadı (en çevirisi mevcut).')
    return
  }

  console.log(`[Category Translate] İşlenecek kategori sayısı: ${total}/${categories.length}`)

  let success = 0
  let failed = 0

  for (let i = 0; i < total; i++) {
    const cat = todo[i]

    const tr = cat.translations.find((t) => t.locale === 'tr')
    const sourceName = (tr?.name?.trim() || cat.name || '').toString()
    const sourceDesc = (tr?.description?.trim() || cat.description || '').toString()

    try {
      const enName = await translateToEnglish(sourceName)
      const enDesc = sourceDesc ? await translateToEnglish(sourceDesc) : ''

      console.log(`  [${i + 1}/${total}] ${cat.id} | TR: "${sourceName}" -> EN: "${enName}"`)

      if (!dryRun) {
        await prisma.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: cat.id, locale: 'en' } },
          update: { name: enName, description: enDesc || null },
          create: { categoryId: cat.id, locale: 'en', name: enName, description: enDesc || null },
        })
      }
      success++
    } catch (err) {
      console.error(`  [${i + 1}/${total}] Hata: ${cat.id} | ${String(err)}`)
      failed++
    }
  }

  console.log(`\n[Category Translate] Tamamlandı. Başarılı: ${success}, Hatalı: ${failed}`)
  if (dryRun && !yes) {
    console.log("[Category Translate] Gerçek yazma için '--yes' veya '-y' bayrağı ile tekrar çalıştırın.")
  }
}

main()
  .catch((err) => {
    console.error('[Category Translate] Genel hata:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })