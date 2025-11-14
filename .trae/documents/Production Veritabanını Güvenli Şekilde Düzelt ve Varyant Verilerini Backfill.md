## Hedefler
- Migrasyon geçmişindeki P3015 hatasını gidermek (bozuk migration klasörlerini temizlemek ve şemayı senkronize etmek).
- Şemayı production veritabanına güvenli şekilde uygulamak (tek ve çoklu varyant boyutu yapısı).
- Mevcut ürünler için varyant verilerini geriye dönük doldurmak: varsayılan boyut Renk, gerektiğinde Beden/Materyal.
- İşlemleri üretim güvenlik kriterlerine uygun (dry-run, yedek, idempotent) yapmak.

## Çıktılar
- `scripts/db/validate-schema.ts`: Şema doğrulama ve P3015 kök neden tespiti; bozuk migration klasörlerini raporlar.
- `scripts/db/fix-migrations.ps1`: Eksik `migration.sql` olan migration klasörlerini güvenli biçimde kaldırır (opsiyonel, manuel onaylı).
- `scripts/db/backup-export.ts`: Etkilenecek tabloların JSON yedeğini üretir (`Product`, `Attribute`, `AttributeOption`, `ProductAttributeValue`, `ProductTranslation`).
- `scripts/db/ensure-category-attributes.ts`: Kategoriler için `color/renk` (`SELECT`) ve `variant_option` (`TEXT`) atributlarını garanti eder; eksik seçenekleri oluşturur.
- `scripts/db/backfill-variant-dimensions.ts`: Varyant grupları için boyut seçimini ve değerleri doldurur (Renk varsayılan, gerekirse birden fazla boyut); `ProductVariantAttribute`, `ProductAttributeValue`, `Product.variantAttributeId` güncellenir.
- `scripts/db/rollback-from-backup.ts`: JSON yedekten geri alma (yalnızca etkilenen alanlar).
- Hepsi idempotent, `--dry-run` ve `--apply` bayraklarını destekler; ayrıntılı log üretir.

## Güvenlik ve Çalıştırma Politikası
- Varsayılan `--dry-run` ile çalışır; `--apply` olmadan hiçbir yazma işlemi yapmaz.
- Yalnızca küçük batch’lerle güncelleme (`--limit`, `--category`, `--group-id` destekleri) ve birden fazla çalıştırma için idempotent kontrol.
- Üretim ortam koruması: `NODE_ENV=production` ise `--apply` ve `--confirm PROD` gerektirir.
- İşlem öncesi `backup-export` çalışır ve dosyaları `./backups/YYYYMMDD-HHmm/` altında saklar.

## Mantık Detayı
- Şema:
  - `Product.variantAttributeId` (tek boyut geriye uyumluluk) ve `ProductVariantAttribute` (çoklu boyut join) varlığını doğrula.
  - Eksikse `db push` ile senkronize et; migrate dev kullanımı bozuk migration klasörleri düzeltilmeden yapılmaz.
- Atributlar:
  - Kategori başına `Attribute(key='color' veya 'renk', type='SELECT')` ve `Attribute(key='variant_option', type='TEXT')` garanti edilir; çeviri adı TR/EN eklenir (varsa korunur).
  - `AttributeOption` seçenekleri, mevcut ürün verisinden türetilir:
    - Öncelikle `ProductAttributeValue` içindeki mevcut değerler (SELECT/TEXT);
    - Yoksa varyant ürün adlarındaki suffix (örn. `Base - Kırmızı`) temizlenerek etiket çıkarılır.
- Varyant grupları:
  - Grup tanımı: `variantGroupId` aynı olan ürünler; yoksa aynı kategori ve taban ad ile gruplandırılır.
  - Birincil ürün: en eski `createdAt` veya `id === variantGroupId`.
  - Seçili boyutlar:
    - Varsayılan Renk: kategoriye `color/renk` varsa onu seç.
    - İhtiyaca göre ek boyutlar (`size/beden`, `material/materyal`) liste ile seçilebilir (parametre destekli).
  - Değer yazımı:
    - `SELECT` için uygun `AttributeOption` bulunur, yoksa oluşturulur (TR adıyla, EN yoksa TR’den çeviri opsiyonel);
    - `TEXT` için `ProductAttributeValue.valueText` yazılır.
  - İlişkiler:
    - `ProductVariantAttribute` birincil ürüne seçili tüm boyutlar için create (idempotent),
    - Tek boyut varsa `Product.variantAttributeId` de set edilir (geriye uyum).

## Çalıştırma Sırası
1. `validate-schema` → bozuk migration klasörü(ler)ini raporla.
2. Gerekirse `fix-migrations.ps1` → eksik `migration.sql` klasörlerini sil (manuel onayla).
3. `npx prisma db push` → şema senkronizasyonu.
4. `backup-export --dry-run` → etkilenecek kayıtları gör.
5. `ensure-category-attributes --dry-run` → oluşturulacak atribut/opsiyonları gör.
6. `backfill-variant-dimensions --dry-run` → gruplar ve yazılacak değerleri gör.
7. `backup-export --apply` → JSON yedek al.
8. `ensure-category-attributes --apply` ve `backfill-variant-dimensions --apply`.
9. Admin ve public UI doğrulaması.

## Doğrulama
- Admin: `tr/admin/products/<id>/variants` → “Varyant Özellikleri” altında Renk/Beden/Materyal seçimi, liste etiketleri birleşik görünür.
- Public: Ürün detayında boyut Select’leri ve seçimle `?variant=<id>` güncellenir.

## Rollback
- `rollback-from-backup --apply` → yalnızca değiştirilmiş alanları yedekten geri yükler (idempotent).

Onayınız sonrası bu scriptleri ekleyip `--dry-run` ile rapor üreteceğim; ardından `--apply` ile üretim veriyi güvenli biçimde güncelleyeceğim.