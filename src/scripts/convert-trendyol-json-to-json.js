/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')
const path = require('path')

// Input JSON provided by user (absolute path)
const inputPath = path.normalize('d:/YazilimProgramlama/ai-amazona/Ürünleriniz_08.10.2025-20.07.json')
const outputDir = path.join(process.cwd(), 'src', 'prisma', 'data')
const outputPath = path.join(outputDir, 'trendyol-products.json')

const TL_PER_USD = 41.70 // Fixed rate per user instruction

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
  // Keep digits, decimal separators and sign
  const cleaned = raw.replace(/[^0-9.,-]/g, '')
  // If value uses comma as decimal (e.g., 1.234,56), normalize by removing thousand dots
  // Otherwise (e.g., 499.0), keep dot as decimal.
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

function pickPriceTL(row) {
  const keys = [
    "Trendyol'da Satılacak Fiyat (KDV Dahil)",
    'Piyasa Satış Fiyatı (KDV Dahil)',
    'BuyBox Fiyatı',
  ]
  for (const k of keys) {
    if (k in row) {
      const v = parseNumber(row[k])
      if (v && v > 0) return v
    }
  }
  return 0
}

function collectImages(row) {
  const images = []
  for (let i = 1; i <= 8; i++) {
    const key = i === 1 ? 'Görsel 1' : `Görsel ${i}`
    if (key in row && row[key]) {
      const s = String(row[key]).trim().replace(/^["'\[\(]+/, '').replace(/[\)\]"']+$/, '')
      if (s) images.push(s)
    }
  }
  return Array.from(new Set(images))
}

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input JSON not found: ${inputPath}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(inputPath, 'utf-8')
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    console.error('Failed to parse input JSON:', e?.message)
    process.exit(1)
  }

  const rows = Array.isArray(data?.Ürünler) ? data.Ürünler : []
  if (!rows.length) {
    console.error('No Ürünler array found or it is empty in input JSON')
    process.exit(1)
  }

  const products = rows.map((row, idx) => {
    const name = String(row['Ürün Adı'] || '').trim()
    const description = String(row['Ürün Açıklaması'] || '').trim()
    const stock = parseIntLike(row['Ürün Stok Adedi']) ?? 0
    const categoryName = String(row['Kategori İsmi'] || 'Imported').trim() || 'Imported'
    const skuRaw = row['Barkod'] || row['Tedarikçi Stok Kodu'] || row['Model Kodu'] || ''
    const baseId = skuRaw ? String(skuRaw).trim() : name ? toSlug(name) : `product-${idx + 1}`
    const id = baseId ? `imported-${toSlug(baseId)}-${idx + 1}` : `imported-${idx + 1}`

    const priceTL = pickPriceTL(row) // TL value including KDV

    const images = collectImages(row)

    return {
      id,
      name: name || `Ürün ${idx + 1}`,
      description: description || '',
      // Leave price in TL here; conversion happens during seeding
      price: priceTL,
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