## Amaç
- Varyantları tek bir özelliğe (şu an Renk) bağlı olmaktan çıkarıp, ürün bazında seçilebilir boyut (ör. Renk, Beden) tanımlayabilmek.
- Dil sistemine (Attribute/Option çevirileri) uygun etiketleme.
- Mevcut varyantlı tüm ürünlerde varsayılan olarak Renk’e göre çalışsın.

## Mevcut Durum
- Etiket önceliği: `color/renk` `SELECT` → yoksa ilk `SELECT` → yoksa `TEXT` `variant_option`.
  - Referans: `src/app/api/admin/products/auto-merge-variants/route.ts`, `src/app/api/admin/products/[id]/variants/route.ts`, `src/app/api/products/variants/[id]/route.ts`.
- Etiket saklama: kategori bazında `Attribute(key='variant_option', type='TEXT')` oluşturulup ürünlerde `ProductAttributeValue.valueText` dolduruluyor.

## Tasarım
- Ürün bazında varyant boyutu seçimi: `Product.variantAttributeId` ile hangi `Attribute`’ın varyant boyutu olduğu işaretlenecek.
- Bir varyant grubu için birincil ürün (id === variantGroupId) bu seçimi tutar; grup üyeleri bu seçime uyar.
- Boyut `SELECT` ise `AttributeOption` üzerinden (i18n destekli) etiket gösterilir; değilse `valueText` kullanılır.
- Varsayılan seçim mantığı: mevcut gruplarda otomatik olarak `color/renk` atanır; yoksa ilk `SELECT`; yoksa boş bırakılır (fallback `variant_option`).

## Veri Modeli
- `src/prisma/schema.prisma`
  - `model Product { variantAttributeId String?; variantAttribute Attribute? @relation(fields: [variantAttributeId], references: [id]) }`
  - (İlişki ve gerekli index eklenir.)

## API Değişiklikleri
- Admin varyant API: `src/app/api/admin/products/[id]/variants/route.ts`
  - Etiket set/okuma işlemlerini `variantAttributeId` seçimine göre yap.
  - Payload’a opsiyonel `variantAttributeId` ekle; ayarlanırsa birincil ürün için kaydet.
  - Dönüşte her varyant için `optionLabel` şu öncelik ile hesaplanır:
    - Eğer `variantAttributeId` set ise: `SELECT` → `AttributeOptionTranslation.name` | `TEXT` → `valueText`.
    - Değilse mevcut öncelik (color/renk → ilk SELECT → variant_option).
- Public ürün varyant API: `src/app/api/products/variants/[id]/route.ts`
  - `optionLabel` hesaplamasını aynı mantığa senkronize et.
- Otomatik birleştirme: `src/app/api/admin/products/auto-merge-variants/route.ts`
  - Grup oluştururken birincil ürüne `variantAttributeId` olarak `color/renk` atanır (bulunursa).

## Admin UI Değişiklikleri
- Sayfa: `src/app/[locale]/(admin)/admin/products/[id]/variants/page.tsx`
  - Üst kısma “Varyant Özelliği” (`Attribute.type === 'SELECT'` öncelikli) seçimi için `Select` ekle; seçenekler kategoriye bağlı `Attribute` çeviri adları ile.
  - Seçim değiştiğinde API’ye `variantAttributeId` gönder; birincil ürün için kaydedilsin ve tüm grup için geçerli olsun.
  - Varyant satırlarında `optionLabel` (örn. “Renk: Kırmızı”, “Beden: Orta”) gösterimi.

## Migrasyon
- İşlem: Mevcut varyantlı tüm gruplar için birincil ürünün `variantAttributeId` değerini `color/renk` `Attribute.id` ile güncelle.
  - Bulma: kategoriye ait `Attribute.key in ['color','renk']` ve `type='SELECT'`.
  - Yoksa atlama (UI’da seçilebilir).
- Test: Örnek veri üzerinde varyant listesi ve etiket görünümü kontrol edilir.

## Doğrulama
- Admin: `/tr/admin/products/.../variants` ekranında boyut seçimi çalışır; etiketler i18n’li görünür.
- Public: Ürün detayında varyant seçenekleri doğru etiket ile listelenir.
- Mevcut gruplarda varsayılan Renk seçimi uygulanmış olur.

## Kod Referansları
- EAV modelleri: `src/prisma/schema.prisma:494–570`
- Admin ürünler/variants UI: `src/app/[locale]/(admin)/admin/products/[id]/variants/page.tsx`
- Admin liste ve auto-merge: `src/app/[locale]/(admin)/admin/products/page.tsx`, `src/app/api/admin/products/auto-merge-variants/route.ts`
- Public varyant API: `src/app/api/products/variants/[id]/route.ts`