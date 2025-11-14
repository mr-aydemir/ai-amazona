## Amaç
- Admin sayfasında (\`/tr/admin/price-multiplier\`) "Eski Fiyat" (\`originalPrice\`) değerlerini, mevcut \`price\` üzerine seçilecek bir oranla (ör. +%20) toplu güncellemek.
- İsteğe bağlı: kategoriye göre filtreleme ve sadece boş/tanımsız eski fiyatı olan ürünlerde uygulama.

## Sunucu (API)
- Yeni endpoint: \`POST /api/admin/products/bulk-original-price-update\`
- Body:
  - \`ratioPercent\` (örn. 20) veya \`multiplier\` (örn. 1.2) — ikisinden biri zorunlu
  - \`categoryId\` (opsiyonel) — belirli kategorideki ürünler
  - \`onlyIfMissing\` (boolean, opsiyonel) — sadece \`originalPrice\` boş/null olanlar
- Yetki: sadece ADMIN
- Uygulama:
  - Tercihen tek SQL ile: \`UPDATE "Product" SET "originalPrice" = ROUND("price" * (1 + r), 2) WHERE ...\`
  - Alternatif: Prisma ile ürünleri çekip tek tek güncelle (küçük veri setleri için)
- Yanıt: \`{ updated, total, filteredByCategoryId }\`

## İstemci (Admin UI)
- Dosya: \`src/app/[locale]/(admin)/admin/price-multiplier/page.tsx\`
- Ekle:
  - Sayısal giriş: \`% oran\` (varsayılan 20)
  - Checkbox: \`Sadece eski fiyatı olmayanları güncelle\`
  - Kategori seçimi (mevcut kategori listesiyle)
  - Buton: \`Eski Fiyatları Güncelle\`
- Davranış:
  - Oran doğrulama (>0)
  - İstek at: \`/api/admin/products/bulk-original-price-update\`
  - Toast ile başarı/başarısızlık bildirimi, güncellenen sayıyı göster

## Güvenlik ve Performans
- ADMIN kontrolü mevcut auth ile
- Tek SQL (\`$executeRaw\`) ile milyonlarca kayıt performanslı güncellenir
- Sayı ve kategori filtresi ile kapsam kontrolü

## Doğrulama
- Kategori filtresiyle küçük örnek kümeler üzerinde test
- Liste bileşeni (sayfanın altındaki ürün listesi) güncelleme sonrası tekrar yüklenir ve \`originalPrice\` alanı görsel olarak doğrulanır

Onay sonrası yeni API’yi ekleyip admin sayfasını güncelleyeceğim; oran girişine göre \`originalPrice\` değerleri \`price * (1 + oran)\` şeklinde güncellenecek.