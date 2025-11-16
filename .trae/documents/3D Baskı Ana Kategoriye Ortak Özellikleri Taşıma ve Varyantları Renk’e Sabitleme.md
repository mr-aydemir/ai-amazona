## Amaç
- Veritabanı yedeğini almak
- Alt kategorilerdeki ortak atributları ana kategori (3D Baskı) altında kanonik hale taşımak
- Alt kategorilerdeki kopya atributları kaldırmak (taşınan değerler silinmeden)
- Ürün varyant seçimini “Renk” atributuna sabitlemek ve tüm varyant gruplarını bu boyuta göre düzeltmek

## Uygulanacak Komutlar ve Sıra
### 1) Yedek Alma
- Komut: `node scripts/db/backup-export.js`
- Çıktı klasörünü not alacağım (ör: `backups/YYYYMMDD-HHMM`).

### 2) Ortak Atributları Ana Kategoriye Taşıma
- Komut: `node scripts/db/move-common-attributes-to-parent.js --apply --parentName "3D Baskı"`
- Etki:
  - “3D Baskı” ana kategorisinin tüm alt kategorilerinde aynı `key`/`type`’a sahip atributlar tespit edilir.
  - Bir tanesi kanonik olarak ana kategoriye taşınır (benzersizlik hatası durumunda mevcut kanonik kullanılır).
  - Tüm ürün değerleri (`ProductAttributeValue`) kanonik atribut ID’sine taşınır; SELECT seçenekleri kanonikte yoksa eklenir.
  - Eski atributlar alt kategorilerde inaktif edilip temizlenir ve silinir.

### 3) Renk Varyantını Geri Doldurma ve Sabitleme
- Komut A (ad etiketlerinden renk çıkarımı ve atama): `node scripts/db/backfill-variant-dimensions.js --apply --limit=10000`
- Komut B (varsa Web Color → Color taşıma): `node scripts/db/migrate-web-color-to-color.js --apply --limit=5000`
- Komut C (Web Color kaldırma): `node scripts/db/remove-web-color-from-variant-dimensions.js --apply --limit=5000`
- Komut D (tekil varyant pointer’ı Color’a set): `node scripts/db/set-color-default-for-all-variants.js --apply --limit=10000`
- Etki:
  - Varyant gruplarında `variantAttributeId` ve `ProductVariantAttribute` eşlemesi “Renk” atributuna sabitlenir.
  - SELECT seçenekleri kanonik renk atributunda oluşturulup tüm ürünlere atanır.
  - Eski Web Color boyutları kaldırılır ve sıralamalar yeniden indekslenir.

## Doğrulama
- “3D Baskı” ana kategorisinde ortak atributların tekil hale geldiğini ve alt kategorilerde kopyaların silindiğini kontrol ederim.
- Örnek 3–5 varyant grubunda:
  - Ürünlerde `variantAttributeId` = kanonik renk atributu
  - `ProductVariantAttribute`’da renk `sortOrder=0` ve diğer boyutlar arkadan sıralı
  - Ürün PAV’ları kanonik atribut ID’ye bağlı; seçenekler kanonikte mevcut

## Geri Alma Planı
- `backups/` altındaki son yedeği kullanarak: `node scripts/db/rollback-from-backup.js` (gerekirse)

## Risk ve Notlar
- İşlemler TX bazlı ve idempotent tasarlandı; benzersizlik hataları script içinde yakalanıp kanonik mevcut atribut kullanılıyor.
- İşlem hacmine göre komutlardaki `--limit` değeri ayarlanabilir.
- İşlem sonrası catalog ve admin arayüzlerinde çeviri ve filtrelenebilirlik (`filterable`) alanları korunur; gerekli ise belirli atributlar için `filterable` toplu işaretleme yapılabilir.

Onayınızdan sonra sıralı şekilde komutları çalıştırıp çıktıları ve örnek doğrulamaları paylaşacağım.