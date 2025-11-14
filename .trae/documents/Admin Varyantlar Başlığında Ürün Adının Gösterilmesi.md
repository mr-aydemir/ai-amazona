## Sorun ve Kök Neden
- Sayfada başlık metninde `{productName}` değişkeni literal olarak görünüyor.
- Kök neden: Türkçe çeviri değerinde yer alan placeholder tek tırnak içinde yazıldığı için ICU MessageFormat tarafından metin olarak değerlendirilmiş.
- Referanslar:
  - `messages/tr/admin.json` → `products.variants.description`: şu anki değer `'{productName}' ürünü için varyantları yönetin`
  - `src/app/[locale]/(admin)/admin/products/[id]/variants/page.tsx:256` → render: `t("description", { productName })`

## Düzenleme
- `messages/tr/admin.json` içinde `products.variants.description` değerini `{productName} ürünü için varyantları yönetin` olarak güncelle.
- Eğer görünürde ürün adını tırnak içinde göstermeyi istiyorsak, tek tırnak yerine çift tırnak kullan: `"{productName}" ürünü için varyantları yönetin`.
- Sayfa bileşeninde ek değişiklik gerekmiyor; `t("description", { productName })` zaten doğru biçimde parametre geçiriyor.

## Doğrulama
- Geliştirme sunucusunu açıp `http://localhost:3000/tr/admin/products/<id>/variants` sayfasına giderek başlıkta gerçek ürün adının göründüğünü doğrula.
- Boş ürün adı olasılığı için bileşen mevcut yükleme akışını koruyor; ürün adı gelene kadar skeleton/placeholder gösterimi devam eder.

## İlgili Dosyalar
- `messages/tr/admin.json` → `products.variants.description`
- `src/app/[locale]/(admin)/admin/products/[id]/variants/page.tsx:256` → `t("description", { productName })`

## Ek Notlar
- Aynı anahtar diğer yerelleştirme dosyalarında (ör. `messages/en/admin.json`) varsa aynı hatayı önlemek için kontrol edip aynı düzeltmeyi uygulayalım.