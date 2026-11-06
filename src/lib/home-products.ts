import { unstable_cache } from 'next/cache'
import type { Product } from '@prisma/client'
import prisma from '@/lib/prisma'

function mapProduct(row: any): Product {
  const translation = row.translations?.[0]
  return {
    ...row,
    name: translation?.name || row.name,
    description: translation?.description || row.description,
    slug: translation?.slug || row.slug || row.id,
  } as unknown as Product
}

async function loadLatestProducts(locale: string): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: { translations: { where: { locale } } },
  })

  const seen = new Set<string>()
  const result: Product[] = []

  for (const row of rows) {
    const key = row.variantGroupId || row.id
    if (seen.has(key)) continue
    seen.add(key)
    result.push(mapProduct(row))
    if (result.length >= 18) break
  }

  return result
}

export const getLatestHomeProducts = unstable_cache(
  loadLatestProducts,
  ['home-latest-products'],
  { revalidate: 120, tags: ['products'] }
)

async function loadTopSellers(locale: string): Promise<Product[]> {
  const grouped = await prisma.orderItem.groupBy({
    by: ['productId'],
    _count: { _all: true },
    orderBy: { _count: { productId: 'desc' } },
  })

  const productRows = await prisma.product.findMany({
    where: { id: { in: grouped.map((row) => row.productId as string) } },
    select: { id: true, variantGroupId: true },
  })
  const idToKey = new Map(productRows.map((row) => [row.id, row.variantGroupId || row.id]))

  const keyCount = new Map<string, number>()
  for (const row of grouped) {
    const productId = row.productId as string
    const key = idToKey.get(productId) || productId
    keyCount.set(key, (keyCount.get(key) || 0) + (row._count?._all || 0))
  }

  let keys = Array.from(keyCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([key]) => key)

  if (keys.length === 0) {
    const all = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, variantGroupId: true },
      orderBy: { createdAt: 'desc' },
    })
    const seen = new Set<string>()
    keys = []
    for (const row of all) {
      const key = row.variantGroupId || row.id
      if (seen.has(key)) continue
      seen.add(key)
      keys.push(key)
      if (keys.length >= 18) break
    }
  }

  const raw = await prisma.product.findMany({
    where: {
      OR: [{ id: { in: keys } }, { variantGroupId: { in: keys } }],
      status: 'ACTIVE',
    },
    include: { translations: { where: { locale } } },
  })

  const keyToProduct = new Map<string, any>()
  for (const product of raw) {
    const key = product.variantGroupId || product.id
    if (!keyToProduct.has(key)) keyToProduct.set(key, product)
  }

  return keys
    .map((key) => keyToProduct.get(key))
    .filter(Boolean)
    .map(mapProduct)
}

export const getHomeTopSellers = unstable_cache(loadTopSellers, ['home-top-sellers'], {
  revalidate: 300,
  tags: ['products'],
})

async function loadPricingSettings() {
  const setting = await prisma.systemSetting.findFirst({
    select: { vatRate: true, showPricesInclVat: true },
  })

  return {
    vatRate: typeof setting?.vatRate === 'number' ? setting.vatRate : undefined,
    showInclVat:
      typeof setting?.showPricesInclVat === 'boolean' ? setting.showPricesInclVat : undefined,
  }
}

export const getHomePricingSettings = unstable_cache(
  loadPricingSettings,
  ['home-pricing-settings'],
  { revalidate: 300, tags: ['settings'] }
)
