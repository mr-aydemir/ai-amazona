## Amaç
- `/google-feed.xml` tek dosya içinde hem Türkçe (tr) hem İngilizce (en) ürün kayıtlarını üretmek.

## Uygulama
- `src/app/google-feed.xml/route.ts` dosyasını RSS + Google namespace ile tek feed oluşturacak şekilde güncelle.
- Ürünleri ve çevirileri çek:
  - `Product` tablosundan aktif ürünler.
  - `ProductTranslation`’dan `tr` ve `en`’e göre `name/description/slug` haritaları.
- Her ürün için iki kayıt üret:
  - TR kayıt: `/tr/products/{slug}` link, TR ad/açıklama.
  - EN kayıt: `/en/products/{slug}` link, EN ad/açıklama.
- Fiyat ve stok bilgisi ortaktır; `SystemSetting.baseCurrency` ile `g:price` yaz.
- Mevcut locale tabanlı feed dosyasını kaldır (gerekirse), tek dosya kullanılsın.

## Doğrulama
- `/google-feed.xml` açıldığında hem TR hem EN ürün kayıtları listelenmeli.
- Linkler locale’e uygun ürün sayfalarına gitmeli.

Onay sonrası tek dosyalı iki dilli feed’i uygulayacağım.