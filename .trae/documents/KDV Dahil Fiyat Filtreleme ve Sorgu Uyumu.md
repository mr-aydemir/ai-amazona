## Sorun Analizi
- UI’de fiyat filtre alanı KDV dahil ve görüntü para biriminde çalışıyor; URL’ye `maxPrice` bu değerde yazılıyor.
- Backend’te `src/app/api/products/[locale]/route.ts:22-24` doğrudan `minPrice/maxPrice` kullanıyor ve KDV/kur dönüşümü yapmıyor; bu da net (KDV hariç) saklanan ürün fiyatıyla uyumsuzluk yaratıyor.
- Öte yandan `src/app/api/products/route.ts:51-65` KDV ve kur oranlarını dikkate alarak eşikleri baza (net) çeviriyor.

## Çözüm
- `src/app/api/products/[locale]/route.ts` içinde `minPrice` ve `maxPrice`’ı, istek URL’sinde görüntü para biriminde/KDV dâhil geldikleri varsayımıyla baza ve KDV hariç değerlere dönüştürüp öyle filtreleme yapmak.
- Dönüşüm için mevcut yardımcıları ve ayarları kullanmak: `getCurrencyData()` ile `baseCurrency` ve `rates`, `systemSetting.showPricesInclVat` ve `systemSetting.vatRate`.
- Görüntü para birimi belirleme: `locale` İngilizce ise `USD`, değilse `baseCurrency` (mevcut mantıkla uyumlu).

## Uygulama Adımları
- `src/app/api/products/[locale]/route.ts`
  - `import { getCurrencyData } from '@/lib/server-currency'` ekle.
  - Ayarlardan `showPricesInclVat` ve `vatRate` oku: `prisma.systemSetting.findFirst(...)`.
  - Kur oranlarını al ve `ratio = displayRate/baseRate` hesapla.
  - `vatFactor = showInclVat ? (1 + vatRate) : 1` olarak belirle.
  - `minPrice/maxPrice` için baza-net dönüşüm uygula: `minNet = minPrice/(ratio*vatFactor)`, `maxNet = maxPrice/(ratio*vatFactor)`.
  - `where.price.gte/lte`’de doğrudan `minPrice/maxPrice` yerine `minNet/maxNet` kullan.
- UI tarafında (`src/components/products/product-sidebar.tsx:94-106`) mevcut davranışı (URL’ye görüntü para birimi ve KDV dahil yazma) koru; kullanıcı URL’de 300 görmeye devam edecek.

## Doğrulama
- `http://localhost:3000/tr/products` sayfasında maks fiyat alanına 300 yazıldığında URL’de `maxPrice=300` kalmalı.
- Backend dönüşüm ile KDV oranı %20 ise filtre `price.lte=250` (baza-net) olarak çalışmalı ve liste buna göre daralmalı.
- Örnek kontrol: `src/app/api/products/[locale]/route.ts`’a geçici log eklemeden, sonuç setinde 250 ve 300 sınırlarına yakın ürünlerin beklenen şekilde gelmesi.

## Notlar
- Ayarlar/borsa kurları eksikse dönüşüm güvenli şekilde pasif kalmalı (varsayılan: KDV=0, oran=1).
- Gerekirse ileride kullanıcı-özel para birimi tercihi `auth()` ile eklenebilir; şu an locale tabanlı seçim mevcut mantıkla uyumlu.