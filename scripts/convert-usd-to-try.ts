import { prisma } from '@/lib/prisma'
import { getCurrencyData, convertServer } from '@/lib/server-currency'

function round2(n: number) {
  return Math.round(n * 100) / 100
}

async function main() {
  console.log('▶️ USD→TRY toplu dönüşüm başlıyor')

  const { baseCurrency, rates } = await getCurrencyData()
  console.log('• Mevcut baseCurrency:', baseCurrency)
  if (!rates || rates.length === 0) throw new Error('Kur tablosu boş')

  // Katsayı: baseCurrency’den TRY’ye dönüşüm (örn. fiyat_USD * katsayı = fiyat_TRY)
  const factorToTRY = convertServer(1, baseCurrency, 'TRY', rates)
  console.log('• Dönüşüm katsayısı (1 base -> TRY):', factorToTRY)
  if (!Number.isFinite(factorToTRY) || factorToTRY <= 0) throw new Error('Geçersiz dönüşüm katsayısı')

  // SystemSetting: kargo ve ücretsiz eşik
  const setting = await prisma.systemSetting.findFirst()
  if (!setting) throw new Error('SystemSetting kaydı bulunamadı')

  const newShippingFlatFee = round2((setting.shippingFlatFee ?? 0) * factorToTRY)
  const newFreeShippingThreshold = round2((setting.freeShippingThreshold ?? 0) * factorToTRY)

  await prisma.systemSetting.update({
    where: { id: setting.id },
    data: {
      shippingFlatFee: newShippingFlatFee,
      freeShippingThreshold: newFreeShippingThreshold,
      baseCurrency: 'TRY',
    },
  })
  console.log('✅ SystemSetting güncellendi:', { newShippingFlatFee, newFreeShippingThreshold, baseCurrency: 'TRY' })

  // Product: price ve originalPrice
  const products = await prisma.product.findMany({ select: { id: true, price: true, originalPrice: true } })
  let updatedProducts = 0
  for (const p of products) {
    const newPrice = round2((p.price ?? 0) * factorToTRY)
    const newOriginal = p.originalPrice != null ? round2((p.originalPrice ?? 0) * factorToTRY) : null
    await prisma.product.update({
      where: { id: p.id },
      data: {
        price: newPrice,
        ...(newOriginal != null ? { originalPrice: newOriginal } : {}),
      },
    })
    updatedProducts++
  }
  console.log(`✅ Product fiyatları güncellendi: ${updatedProducts}`)

  // OrderItem ve Order: fiyatlar, kargo ve total
  const orders = await prisma.order.findMany({ select: { id: true, total: true, shippingCost: true } })
  const orderItems = await prisma.orderItem.findMany({ select: { id: true, price: true } })

  let updatedItems = 0
  for (const it of orderItems) {
    const newPrice = round2((it.price ?? 0) * factorToTRY)
    await prisma.orderItem.update({ where: { id: it.id }, data: { price: newPrice } })
    updatedItems++
  }
  console.log(`✅ OrderItem fiyatları güncellendi: ${updatedItems}`)

  let updatedOrders = 0
  for (const o of orders) {
    const newShipping = round2((o.shippingCost ?? 0) * factorToTRY)
    const newTotal = round2((o.total ?? 0) * factorToTRY)
    await prisma.order.update({
      where: { id: o.id },
      data: {
        shippingCost: newShipping,
        total: newTotal,
      },
    })
    updatedOrders++
  }
  console.log(`✅ Order toplamları ve kargo güncellendi: ${updatedOrders}`)

  console.log('ℹ️ Kur tablosu yeni baz TRY’ye göre yeniden hesaplanmalı (admin cron).')
  console.log('▶️ Tamamlandı.')
}

main()
  .catch((e) => {
    console.error('❌ Dönüşüm hatası:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })