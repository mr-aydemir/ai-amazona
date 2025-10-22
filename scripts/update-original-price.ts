import { prisma } from '@/lib/prisma'

function roundToTwo(n: number) {
  return Math.round(n * 100) / 100
}

async function run() {
  console.log('▶️ Backfill: originalPrice = price * 1.03')

  const products = await prisma.product.findMany({
    select: { id: true, price: true, originalPrice: true }
  })

  if (!products.length) {
    console.log('ℹ️ No products found.')
    return
  }

  let updated = 0
  for (const p of products) {
    const newOriginal = roundToTwo((p.price ?? 0) * 1.03)
    try {
      await prisma.product.update({
        where: { id: p.id },
        data: { originalPrice: newOriginal }
      })
      updated++
    } catch (e) {
      console.error('⚠️ Update failed for product', p.id, e)
    }
  }

  console.log(`✅ Backfill complete. Updated ${updated} of ${products.length} products.`)
}

run()
  .catch((e) => {
    console.error('❌ Backfill error:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })