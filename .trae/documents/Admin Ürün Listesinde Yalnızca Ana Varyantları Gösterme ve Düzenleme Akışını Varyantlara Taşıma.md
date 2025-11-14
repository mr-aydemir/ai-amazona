## Amaç

* Admin ürün tablosunda yalnızca ana varyantlar (grup başı ürünler) listelensin.

* "Ürünü Düzenle" işlemi varyant düzenleme ekranına yönlendirsin.

* İkinci göz (varyant düzenleme kısayolu) butonu kaldırılsın.

## Veri Modeli ve Kriter

* Ana varyant tanımı: `groupKey = variantGroupId ?? id`. Bir gruptaki ana ürünün `id === variantGroupId` olur; grubu olmayan ürünlerin `variantGroupId` değeri `null`.

* Listelemede gösterilecekler: `variantGroupId === id` olanlar ve `variantGroupId == null` olanlar.

## Sunucu (API) Değişiklikleri

* Dosya: `src/app/api/admin/products/route.ts`

* GET endpoint’e `onlyPrimary=1` parametresi desteği ekle.

* Uygulama:

  1. `searchParams.get('onlyPrimary')` ile bayrağı oku.
  2. Taban `where` (arama/kategori) kurallarını oluştur.
  3. Eğer `onlyPrimary` aktifse:

     * `groupIds`: `await prisma.product.findMany({ where: { ...where, variantGroupId: { not: null } }, select: { variantGroupId: true } })` ile tüm grup kimliklerini topla ve `unique` yap.

     * `primaryWhere`: `{ OR: [{ variantGroupId: null }, { id: { in: groupIds } }] }` oluştur.

     * `count`: `await prisma.product.count({ where: { AND: [where, primaryWhere] } })`

     * `findMany`: aynı `AND` ile, `orderBy/skip/take/include` korunarak ürünleri çek.
  4. Çeviri ve görsel parse mantığı (satır 206–219) aynen korunur.

* Referans satırlar:

  * Parametre okuma: `src/app/api/admin/products/route.ts:152–158`

  * Listeleme: `src/app/api/admin/products/route.ts:187–204`

  * Çeviri parse: `src/app/api/admin/products/route.ts:206–219`

## İstemci (Admin Liste) Değişiklikleri

* Dosya: `src/app/[locale]/(admin)/admin/products/page.tsx`

* Sadece ana varyantları çekmek için istek URL’sine `onlyPrimary=1` ekle.

  * Değişiklik: `fetch` satırı → `src/app/[locale]/(admin)/admin/products/page.tsx:79`

  * Uygulama: `params.set('', '1')`

* Düzenleme butonunu varyant ekranına yönlendir.

  * Değişiklik: `onClick={() => router.push("/${locale}/admin/products/${product.id}/variants")}`

  * Referans: `src/app/[locale]/(admin)/admin/products/page.tsx:323`

* İkinci göz (varyant düzenleme kısayolu) butonunu kaldır.

  * Referans: `src/app/[locale]/(admin)/admin/products/page.tsx:327–333`

* İstatistik kutuları ve toplam sayılar API’dan dönen filtrelenmiş `total` ile doğru çalışır.

## Doğrulama

* URL: `http://localhost:3000/tr/admin/products`

* Beklenenler:

  * Tablo yalnızca ana varyantları ve grubu olmayan ürünleri gösterir.

  * "Düzenle" butonu ilgili ürünün `variants` sayfasını açar.

  * İkinci göz butonu görünmez.

  * Kartlardaki toplam sayılar ve pagination tutarlı çalışır.

## Kod Referansları

* Liste sayfası: `src/app/[locale]/(admin)/admin/products/page.tsx:79, 323, 327–333`

* API listeleme: `src/app/api/admin/products/route.ts:152–158, 187–219`

* Varyant grup mantığı: `src/prisma/schema.prisma:76–93` (Product.variantGroupId)

