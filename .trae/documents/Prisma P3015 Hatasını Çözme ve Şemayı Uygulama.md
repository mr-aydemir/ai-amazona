## Hata Nedeni
- `prisma/migrations` altında bir klasör mevcut ancak içinde `migration.sql` dosyası yok (yarım kalmış/bozulmuş migrasyon).
- `prisma migrate dev` bu eksik dosya yüzünden duruyor.

## Çözüm Adımları
### 1) Bozuk Migrasyon Klasörünü Temizle
- Klasörleri listeleyin: `dir prisma\migrations`
- İçinde `migration.sql` olmayan boş/eksik klasörü silin: `Remove-Item -Recurse -Force prisma\migrations\<bozuk_klasör>`
- Eğer birden fazla bozuk klasör varsa hepsini temizleyin.

### 2) Şemayı Uygula (Dev Ortam)
- Hızlı senkronizasyon (dev için güvenli):
  - `npx prisma db push`
  - `npx prisma generate`
- Alternatif: Migrasyon dosyası üretip uygula:
  - `npx prisma migrate dev -n "multi-variant-dimensions"`

### 3) Sunucuyu Yeniden Çalıştır
- Geliştirme sunucusunu yeniden başlatın ve admin/public varyant akışını test edin:
  - Admin: `http://localhost:3000/tr/admin/products/<id>/variants`
  - Public: Ürün detayında varyant Select’leri görünmeli ve seçimle `?variant=<id>` güncellenmeli.

### 4) Notlar
- Neon PostgreSQL bağlantısı çalışıyor görünüyor; sorun dosya eksikliğinden kaynaklı.
- Eğer migrasyon geçmişinde başka bozulmalar varsa:
  - Geçici çözüm: `db push` ile senkronize edin, ardından yeni migrasyonu üretin.
  - Gerekirse `prisma migrate resolve` komutlarıyla geçmişi işaretleyin.

## Beklenen Sonuç
- P3015 hatası giderilir.
- Şema değişiklikleri (çoklu varyant boyutu tablosu ve alanlar) veritabanına uygulanır.
- Varyant seçimi admin ve public ekranlarda görünür ve çalışır.