## Yapılacaklar
- Şema: `ProductVariantAttribute` için `sortOrder Int @default(0)` eklenir.
- Admin API: Çoklu boyut POST’unda gelen dizi sırasını `sortOrder` olarak kaydeder; GET zaten `variantAttributeIds` döndürüyor.
- Admin UI: “Seçim Sırası” alanı eklenir; seçili atributlar için yukarı/aşağı ile sıralama, sunucuya gönderme.
- Public API: `variants[].attributes` (attrId, attrName, label) eklenir; locale’e göre çeviri kullanılır.
- Ürün Detayı: Her Select’in seçenekleri önceki seçimlere göre filtrelenir; tüm seçimler tamamlandığında uygun varyant etkinleştirilir ve `?variant=<id>` güncellenir.
- Üretim: Şema `db push` ile senkronize edilir.

Onay sonrası uygulamaya başlayacağım ve test edeceğim.