import 'server-only'
import { translate } from '@vitalets/google-translate-api';
import { HttpProxyAgent } from 'http-proxy-agent';
import { promises as fs } from 'fs'
import path from 'path'

let cachedProxies: string[] | null = null
let proxyCursor = 0
let lastListKey = ''

function normalizeProxy(raw: string | undefined | null): string | null {
  const val = String(raw ?? '').trim()
  if (!val) return null
  const withProtocol = val.startsWith('http://') || val.startsWith('https://') ? val : `http://${val}`
  try {
    // eslint-disable-next-line no-new
    new URL(withProtocol)
    return withProtocol
  } catch {
    return null
  }
}

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
        // Stick to the successful proxy; update cursor to its index
        proxyCursor = (proxyCursor + i) % list.length
        return translated
      }
    } catch (error: any) {
      // Try next proxy on error
      continue
    }
  }
  // Exhausted all proxies; move cursor to the start of next round
  proxyCursor = (proxyCursor + ordered.length) % list.length
  return text
}

export async function translateToEnglish(text: string): Promise<string> {
  const input = (text || '').toString()
  if (!input.trim()) return ''
  try {
    return await translateWithVitalets(input)
  } catch {
    return input
  }
}