import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

// Absolute path provided by user
const inputPath = path.normalize('d:/YazilimProgramlama/ai-amazona/Ürünleriniz_08.10.2025-20.07.xlsx')
const outputDir = path.join(process.cwd(), 'src', 'prisma', 'data')
const outputPath = path.join(outputDir, 'trendyol-products.json')

function normalize(str: string) {
  return (str || '')
    .toLowerCase()
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .replace(/[çÇ]/g, 'c')
    .trim()
}

function toSlug(str: string) {
  return normalize(str)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function parseNumber(val: any): number | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return val
  const raw = String(val).trim()
  const cleaned = raw.replace(/[^0-9.,-]/g, '')
  const s = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(/,/g, '.') : cleaned
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseIntLike(val: any): number | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return Math.round(val)
  const s = String(val).replace(/[^0-9]/g, '')
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

// Attempt to map common Turkish/English column names
const keys = {
  name: ['ürün adı', 'ad', 'product name', 'name', 'ürün'],
  description: ['açıklama', 'description', 'ürün açıklaması'],
  price: ['fiyat', 'price', 'satış fiyatı', 'birim fiyat'],
  stock: ['stok', 'stock', 'miktar', 'adet'],
  category: ['kategori', 'alt kategori', 'category'],
  sku: ['sku', 'ürün kodu', 'barkod', 'barcode'],
}

function findValue(row: Record<string, any>, candidates: string[]): any {
  const cols = Object.keys(row)
  for (const cand of candidates) {
    const cNorm = normalize(cand)
    const hit = cols.find((k) => normalize(k) === cNorm)
    if (hit) return row[hit]
  }
  return null
}

function collectImages(row: Record<string, any>): string[] {
  const cols = Object.keys(row)
  const images: string[] = []
  for (const key of cols) {
    const k = normalize(key)
    if (k.includes('resim') || k.includes('gorsel') || k.includes('görsel') || k.includes('image') || k.includes('img')) {
      const val = row[key]
      if (!val) continue
      if (Array.isArray(val)) {
        for (const v of val) {
          const s = String(v).trim()
          if (s) images.push(s)
        }
      } else {
        const s = String(val)
        // Split by comma or whitespace if multiple URLs
        const parts = s.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean)
        images.push(...parts)
      }
    }
  }
  // Deduplicate
  return Array.from(new Set(images))
}

function formatDescription(s: any) {
  return String(s ?? '')
    .split(/[;；]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n')
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input XLSX not found: ${inputPath}`)
    process.exit(1)
  }

  const wb = XLSX.readFile(inputPath)
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' })

  const products = rows.map((row, idx) => {
    const name = String(findValue(row, keys.name) ?? '').trim()
    const descriptionRaw = findValue(row, keys.description)
    const description = formatDescription(descriptionRaw)
    const priceRaw = findValue(row, keys.price)
    const stockRaw = findValue(row, keys.stock)
    const categoryNameRaw = findValue(row, keys.category)
    const skuRaw = findValue(row, keys.sku)
    const images = collectImages(row)

    const price = parseNumber(priceRaw) ?? 0
    const stock = parseIntLike(stockRaw) ?? 0
    const categoryName = String(categoryNameRaw ?? 'Imported').trim() || 'Imported'

    const baseId = skuRaw ? String(skuRaw).trim() : name ? toSlug(name) : `product-${idx + 1}`
    const id = baseId ? `imported-${toSlug(baseId)}-${idx + 1}` : `imported-${idx + 1}`

    return {
      id,
      name: name || `Ürün ${idx + 1}`,
      description: description || '',
      price,
      images,
      stock,
      categoryName,
    }
  })

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), 'utf-8')
  console.log(`✅ Wrote ${products.length} products to ${outputPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})