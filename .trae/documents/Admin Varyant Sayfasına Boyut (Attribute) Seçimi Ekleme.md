## Amaç
- `http://localhost:3000/tr/admin/products/:id/variants` sayfasına “hangi attribute’a göre varyant seçileceğini” belirleyen seçim alanı eklemek.
- Çoklu seçim (örn. Renk + Beden) ve seçim sırası desteği (Renk → Beden).

## UI Değişikliği (VariantsPage)
- Sol panel üstüne “Varyant Özellikleri” bölümü ekle:
  - Kategoriye bağlı uygun atributları (`SELECT` + `variant_option`) listele.
  - Checkbox ile birden fazla atribut seçimi.
  - Seçim sırası için basit ↑/↓ kontrolü.
- Veri kaynakları:
  - Kategori atributları: `GET /api/admin/categories/:categoryId/attributes?locale=tr`
  - Seçili atributlar: `GET /api/admin/products/:id/variants` (response’a `variantAttributeIds` dahil)

## API Desteği
- Kaydetme: `POST /api/admin/products/:id/variants` isteğine `variantAttributeIds: string[]` ekle.
  - Join tabloya (`ProductVariantAttribute`) her id için `sortOrder` ile kayıt.
  - Tek boyut seçili ise geriye uyumluluk için `Product.variantAttributeId` da set edilebilir.
- GET yanıtı: `variantAttributeIds` döndürerek UI’ı hydrate et.

## Etiket/İsim
- Public tarafı zaten locale’e göre etiketlerini `AttributeTranslation`/`AttributeOptionTranslation` ile oluşturuyor.
- Admin’de sadece seçim kontrolü yapılır; etiket üretimi public API’den gelir.

## Doğrulama
- Admin sayfada seçim/ sıra değiştir ve kaydet → sayfa refresh/yenilemede seçimler geri gelsin.
- Public ürün detayda Renk seçimi sonrası sadece o renkteki Bedenler listelensin; kombinasyonda doğru varyanta geçiş olsun.

Onay sonrası UI bölümünü ekleyip API ile bağlayacağım; mevcut kod yapısına ve dil/çeviri sistemine uyumlu çalışacak.