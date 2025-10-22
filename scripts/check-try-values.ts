import { prisma } from '@/lib/prisma'

async function main() {
  const setting = await prisma.systemSetting.findFirst()
  const product = await prisma.product.findFirst({ orderBy: { id: 'asc' } })
  const order = await prisma.order.findFirst({ orderBy: { id: 'asc' } })
  console.log('SystemSetting:', {
    baseCurrency: setting?.baseCurrency,
    shippingFlatFee: setting?.shippingFlatFee,
    freeShippingThreshold: setting?.freeShippingThreshold,
  })
  console.log('Sample Product:', {
    id: product?.id,
    price: product?.price,
    originalPrice: product?.originalPrice,
  })
  console.log('Sample Order:', {
    id: order?.id,
    total: order?.total,
    shippingCost: order?.shippingCost,
  })
}

main()
  .catch((e) => {
    console.error('Check error:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })