import { getCurrencyData, convertServer } from '@/lib/server-currency'

async function testTrendyolImport() {
  console.log('🧪 Trendyol import fiyat dönüşümü testi')

  const { baseCurrency, rates } = await getCurrencyData()
  console.log('• Sistem para birimi:', baseCurrency)
  console.log('• Döviz kurları:', rates)

  // Örnek Trendyol fiyatı (TRY)
  const tryPrice = 500 // 500 TL
  const ratio = 1.2 // %20 artış

  // Mevcut yöntem: TRY'den sistem para birimine dönüştür
  const baseConverted = convertServer(tryPrice, 'TRY', baseCurrency, rates)
  const finalPrice = Math.max(0, baseConverted * ratio)

  console.log('• Trendyol fiyatı (TRY):', tryPrice)
  console.log('• Oran:', ratio)
  console.log('• Sistem para birimine dönüştürülmüş:', baseConverted.toFixed(2))
  console.log('• Final fiyat (oran uygulandıktan sonra):', finalPrice.toFixed(2))

  if (baseCurrency === 'TRY') {
    console.log('✅ Sistem TRY bazlı - TRY→TRY dönüşümü 1:1 oranında')
    console.log('✅ Beklenen sonuç:', (tryPrice * ratio).toFixed(2))
    console.log('✅ Sonuç doğru:', finalPrice === (tryPrice * ratio) ? 'Evet' : 'Hayır')
  } else {
    console.log('ℹ️ Sistem farklı para birimi - TRY→' + baseCurrency + ' dönüşümü yapılıyor')
    console.log('ℹ️ Dönüşüm oranı:', rates[baseCurrency] || 'Bulunamadı')
  }

  // İleride para birimi değiştiğinde test senaryosu
  console.log('\n🔮 İleride USD\'ye geçiş senaryosu:')
  if (rates['USD']) {
    const usdConverted = convertServer(tryPrice, 'TRY', 'USD', rates)
    const usdFinalPrice = Math.max(0, usdConverted * ratio)
    console.log('• TRY→USD dönüşümü:', usdConverted.toFixed(2), 'USD')
    console.log('• USD final fiyat:', usdFinalPrice.toFixed(2), 'USD')
  }
}

testTrendyolImport()
  .catch(console.error)
  .finally(() => process.exit(0))