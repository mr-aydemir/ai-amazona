/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const inputPath = path.normalize('d:/YazilimProgramlama/ai-amazona/Ürünleriniz_08.10.2025-20.07.xlsx')
const outputDir = path.join(process.cwd(), 'src', 'prisma', 'data')
const outputPath = path.join(outputDir, 'trendyol-products.json')

function normalize(str) {
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

function toSlug(str) {
  return normalize(str)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function parseNumber(val) {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return val
  const raw = String(val).trim()
  const cleaned = raw.replace(/[^0-9.,-]/g, '')
  const s = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(/,/g, '.') : cleaned
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseIntLike(val) {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return Math.round(val)
  const s = String(val).replace(/[^0-9]/g, '')
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

const keys = {
  // Explicit Trendyol headers per provided column order
  name: ['Ürün Adı', 'ürün adı', 'ad', 'product name', 'name', 'ürün'],
  description: ['Ürün Açıklaması', 'ürün açıklaması', 'açıklama', 'description'],
  price: [
    "Trendyol'da Satılacak Fiyat (KDV Dahil)",
    'Piyasa Satış Fiyatı (KDV Dahil)',
    'BuyBox Fiyatı',
    'fiyat',
    'price',
    'satış fiyatı',
    'birim fiyat'
  ],
  stock: ['Ürün Stok Adedi', 'stok', 'stock', 'miktar', 'adet'],
  category: ['Kategori İsmi', 'kategori', 'alt kategori', 'category'],
  sku: ['Barkod', 'Tedarikçi Stok Kodu', 'Model Kodu', 'sku', 'ürün kodu', 'barcode'],
}

function findValue(row, candidates) {
  const cols = Object.keys(row)
  for (const cand of candidates) {
    const cNorm = normalize(cand)
    const hit = cols.find((k) => normalize(k) === cNorm)
    if (hit) return row[hit]
  }
  return null
}

function collectImages(row) {
  const cols = Object.keys(row)
  const images = []
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
        const parts = s.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean)
        images.push(...parts)
      }
    }
  }
  return Array.from(new Set(images))
}

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input XLSX not found: ${inputPath}`)
    process.exit(1)
  }

  const wb = XLSX.readFile(inputPath)
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

  const products = rows.map((row, idx) => {
    const name = String(findValue(row, keys.name) ?? '').trim()
    const description = String(findValue(row, keys.description) ?? '').trim()
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

main()