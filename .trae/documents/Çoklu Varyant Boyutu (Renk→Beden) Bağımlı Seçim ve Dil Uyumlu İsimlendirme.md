## Amaç
- Varyantları birden çok atributa göre seçilebilir hale getirmek (örn. önce Renk, sonra o renkte mevcut Bedenler).
- Seçilen atributlara göre varyant etiket/isimlerinin seçili dile uygun otomatik oluşması.
- Admin ekranında hangi atributların (ve sıralarının) varyant belirlemede kullanılacağını seçmek.

## Veri ve API Tasarımı
- Public API (`src/app/api/products/variants/[id]/route.ts`):
  - Döndürsün:
    - `dimensions`: `[ { id, key, name, type, options: [{ label }] } ]` (mevcut)
    - `variants`: her varyant için `attributes`: `[ { attrId, attrName, label } ]` (yeni) — böylece istemci, bağımlı seçenekleri türetebilir.
    - İsteğe bağlı `graph`: `Record<attrId, Record<label, Record<nextAttrId, string[]>>>` — bir üst seçime göre alt seçenekler; performans için sunucuda da hazır üretilebilir.
  - Etiket/isim çevirisi: `AttributeTranslation`/`AttributeOptionTranslation` üzerinden locale ile.

## İstemci (Ürün Detayı)
- `src/components/products/product-info.tsx`:
  - `variantDimensions` ile bir Select zinciri render et (örn. Renk → Beden).
  - Bir Select’te seçim yapıldığında, bir sonraki Select’in seçeneklerini mevcut seçimlerle uyumlu varyantların `attributes`’ından filtrele.
  - Tüm boyutlar seçildiğinde, kombinasyona uyan varyantı etkinleştir; URL `?variant=<id>` güncellensin.
  - Kısmi seçimlerde aktif varyant değiştirme (isteğe bağlı): ilk uygun varyanta “ön izleme” yapılabilir, ancak siparişte tüm boyutlar zorunlu olsun.

## Admin (Varyantlar)
- `src/app/[locale]/(admin)/admin/products/[id]/variants/page.tsx`:
  - Mevcut çoklu boyut checkboxları korunur.
  - Boyut sırası belirleme (örn. Renk önce, Beden sonra): küçük bir sıralama UI (drag/drop veya up/down) ve POST isteği ile kaydetme.
  - API (`src/app/api/admin/products/[id]/variants/route.ts`) seçili boyutların sırasını da kaydetsin (join tablosunda `sortOrder`).

## İsim/Etiket Otomasyonu
- Varyant `optionLabel`: seçilen tüm atributların ad+değerleri birleştirilsin (örn. `Renk: Kırmızı | Beden: Medium`).
- Ürün ad çevirileri: mevcut mantık korunur; gerektiğinde admin akışında isimler güncellenebilir.

## Şema İnce Ayar (Gerekirse)
- `ProductVariantAttribute` join tablosuna `sortOrder Int @default(0)` alanı ekleyelim; boyut sırası için.
- Production güvenliği: önce `db push` ile şema senkronizasyonu, migrasyon geçmişi bozuksa (P3015) temizleyip sonra migrate dev.

## Doğrulama
- Public:
  - Bir ürün için Renk seçimi → Beden Select’i filtrelenmiş seçenekler göstermeli; 2 seçimin kombinasyonu ile doğru varyant aktif olmalı.
- Admin:
  - Boyut seçimi ve sıralaması kaydedilmeli; public UI buna uygun davranmalı.

## Adımlar
1. Public API’ye `variants[].attributes` ve isteğe bağlı `graph` ekleme.
2. ProductInfo’da bağımlı seçim mantığı ve filtreleme.
3. Admin’de boyut sırası UI ve API desteği (`sortOrder`).
4. Dil uyumlu etiket üretimi; çeviri kayıtları kullanımı.
5. Güvenli şema güncellemeleri ve idempotent veri güncellemeleri.

Onayınızla bu değişiklikleri uygulayıp test edeceğim; üretim veritabanı için yalnız `db push` ile senkronizasyon ve idempotent yazımlar kullanacağım.