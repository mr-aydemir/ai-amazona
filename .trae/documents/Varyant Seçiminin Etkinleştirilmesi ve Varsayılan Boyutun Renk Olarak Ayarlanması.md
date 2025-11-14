## Sorun Özeti
- Ürün detay sayfasında varyant seçimi görünmüyor.
- Admin varyant ekranında hangi atribut(lar)ın varyant belirlemede kullanılacağı seçilemiyor.
- Mevcut ürünlerde varsayılan varyant boyutu Renk olmalı.

## Çözüm Adımları
### 1) Ürün Detayında Varyant Seçimi
- Public varyant API ilgili ürün grubuna ait varyantları ve `variantDimensions` listesini döndürecek.
- UI (`ProductInfo`) iki modda çalışacak:
  - `variantDimensions` boş → tek Select ile varyant listesi.
  - `variantDimensions` dolu → her boyut için bir Select; birleşik etiketlerle doğru varyanta yönlendirme.
- Kod referansları: `src/app/api/products/variants/[id]/route.ts`, `src/components/products/product-info.tsx`, `src/components/products/product-detail-client.tsx`, `src/app/[locale]/(home)/products/[slug]/page.tsx`.

### 2) Admin Varyantlar Sayfasında Boyut Seçimi
- "Varyant Özellikleri" bölümü eklenir ve kategoriye bağlı uygun atributlar (`SELECT` ve `variant_option`) checkbox olarak listelenir.
- Seçimler `POST /api/admin/products/:id/variants` ile kaydedilir ve grup birincil ürüne bağlanır.
- Kod referansı: `src/app/[locale]/(admin)/admin/products/[id]/variants/page.tsx`, `src/app/api/admin/products/[id]/variants/route.ts`.

### 3) Mevcut Ürünlerde Varsayılan Boyutun Renk Olarak Ayarlanması
- Bir defaya mahsus veri düzeltme:
  - Her varyant grubu için birincil üründe `color/renk` `SELECT` atributu bulunursa, bunu varsayılan boyut olarak ata.
  - Grup yoksa önce auto-merge ile grupları oluştur (aynı kategori ve taban ad ile), ardından renk boyutunu ata.
- Uygulama:
  - Auto-merge endpointinde renk atributu varsa `variantAttributeId=color` atanır.
  - Gerekirse ayrıca bir script/endpoint ile tüm gruplar için renge ayarlama yapılır.
- Kod referansı: `src/app/api/admin/products/auto-merge-variants/route.ts`.

### 4) Kategori Atributlarının Sağlanması
- Renk (color/renk) atributu kategoride yoksa `SELECT` tipinde oluşturulur.
- Admin kategori atributları API ile yönetim: `GET/PUT /api/admin/categories/:id/attributes`.

### 5) Migrasyon ve Üretim
- Veritabanı şema değişiklikleri için migrasyon ve client üretimi:
  - `prisma migrate dev -n "multi-variant-dimensions"`
  - `prisma generate`
- Ardından test: bir ürün için varyantlar sayfasında boyutu seç; ürün detayda seçilebilir kombinasyonları doğrula.

### 6) Hata Önleme
- Join tablo erişimleri try/catch ile sarılır; migrasyon uygulanmamış olsa bile API 500 yerine boş listeyle döner.
- Admin API yetkilendirmesi için oturum kontrolü yapılır.

## Beklenen Sonuçlar
- Ürün detayında varyant seçimleri görünür ve çalışır.
- Admin varyant ekranında bir veya daha fazla atribut seçilerek varyant belirleme boyutları ayarlanır.
- Mevcut ürünlerde varsayılan varyant boyutu Renk olarak atanır ve kullanıcı doğru kombinasyonları seçebilir.