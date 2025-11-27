## Amaç ve Kapsam
- Kodlu kampanyalar: yüzde/tutar indirimi, kategori/ürün bazlı, minimum tutar/adet, tarih aralığı, kullanım limitleri.
- Bire Al Bire Bedava (BOGO): “Bir alana bir bedava”, “X al Y bedava” (aynı ürün/kategori veya seçili ürünler).
- Admin panelinden kuponları listeleme, oluşturma, düzenleme, aktif/pasif yapma.
- Sepet ve ödeme (checkout) akışına entegrasyon, çoklu para birimi ve KDV ayarlarına uyum.

## Veri Modeli (Prisma)
- Coupon
  - id, code (benzersiz), status (ACTIVE/INACTIVE), startsAt, endsAt
  - discountType: PERCENT | AMOUNT | BOGO
  - amountPercent, amountFixed, currency, maxDiscount
  - usageLimit (toplam), perUserLimit (kişi başı), stackingPolicy: EXCLUSIVE | STACKABLE
- CouponRule
  - id, couponId (FK), scopeType: CATEGORY | PRODUCT | CART_TOTAL
  - scopeValueId (kategoriId/ürünId, CART_TOTAL için boş), minQty, minAmount
  - BOGO alanları: bogoBuyQty, bogoGetQty, bogoSameItemOnly, bogoTargetScope (SAME_CATEGORY | SAME_PRODUCT | ANY)
- CouponRedemption
  - id, couponId, userId (opsiyonel), orderId, usedAt, discountApplied
  - Toplam ve kullanıcı bazlı kullanım takibi için indeksler

## İş Kuralları ve Hesaplama Motoru
- Doğrulama: tarih aralığı, durum, kullanım limitleri, per-user limit, stackingPolicy.
- Kapsam Eşleşmesi: CATEGORY/PRODUCT bazlı kurallar; CART_TOTAL için sepet toplamı eşiği.
- İndirim Hesaplama
  - AMOUNT: sabit tutar indirimi (maxDiscount ve KDV/kur ayarlarına uyum)
  - PERCENT: yüzde indirimi (üst sınır, yuvarlama)
  - BOGO: uygun kalemleri gruplar, bedava/indirimli kalemi seçer (tercihen en ucuz “get” kalemi); bogoSameItemOnly ve bogoTargetScope’a göre eşleştirme.
- Stacking: EXCLUSIVE ise tek kupon; STACKABLE ise toplam indirimi üst sınıra göre birleştirir.
- Çıktı: uygulanmış indirim satırları, etkilenen kalemler, yeni toplamlar ve kullanıcıya mesaj.

## API Tasarımı
- Public
  - POST `/api/coupons/validate` → { cart, code } alır; geçerlilik ve beklenen etki önizlemesi döner.
  - POST `/api/cart/apply-coupon` → sepete kupon ekleme/kaldırma; mevcut `api/cart` yapısına `appliedCoupons` ve `discountLines` ekler.
- Checkout
  - POST `/api/checkout` içinde kuponların final doğrulaması, indirimlerin uygulanması, `CouponRedemption` kaydı.
- Admin
  - GET/POST `/api/admin/coupons` (liste, oluştur)
  - GET/PUT/DELETE `/api/admin/coupons/:id` (detay, düzenle, sil)

## Admin Panel (UI)
- Sayfa: `/[locale]/admin/coupons`
  - Liste: kod, durum, tarih aralığı, indirim tipi/özeti, kullanımlar/limitler.
  - Form: kod (otomatik/manuel), indirim tipi ve değerleri, kurallar (scope ve eşikler), tarih aralığı, stackingPolicy, usageLimit/perUserLimit.
  - Doğrulama: benzersiz kod, zorunlu alanlar, tarih mantığı.
- Çeviriler: `messages/tr/admin.json`, `messages/en/admin.json` güncellemeleri.

## Müşteri Tarafı Entegrasyon
- Sepet bileşenine kupon kodu alanı: kod girme/temizleme, geçerlilik mesajları.
- Kupon uygulandığında fiyatları canlı güncelleme; indirim kalemlerini görüntüleme.
- Checkout’ta final kontrol ve indirimlerin uygulanması.

## Güvenlik ve Sınırlar
- Kod normalizasyonu (trim, upper-case), rate-limit (brute-force engelleme).
- Sunucu tarafı final doğrulama (client değişikliklerine karşı).
- EXCLUSIVE kupon kuralı için tek kupon kullanım uyarısı.

## Testler
- Birim: AMOUNT/PERCENT/BOGO kombinasyonları; minAmount/minQty; maxDiscount; stacking.
- Entegrasyon: `api/cart`, `api/checkout` akışları ile uçtan uca.
- Regresyon: tarih aralığı ve kullanım limitleri.

## İzleme ve Raporlama
- En çok kullanılan kuponlar, toplam indirim etkisi, başarısız doğrulama nedenleri.
- Admin’de basit rapor kartları.

## Kademeli Uygulama Adımları
1. Prisma şema ekle ve migration oluştur.
2. Hesaplama motoru: AMOUNT ve PERCENT (kategori/ürün/CART_TOTAL) → fonksiyonlar.
3. Admin API ve UI: kupon CRUD + kural oluşturma/düzenleme.
4. Sepet API ve UI: kupon girme/uygulama; canlı indirim hesaplama.
5. Checkout entegrasyonu ve `CouponRedemption` kaydı.
6. BOGO hesaplaması ve kural seti (bir alana bir bedava, X al Y bedava).
7. Testler ve rapor/izleme.

## Örnek Kampanya Konfigürasyonları
- “Bir Alana Bir Bedava” (BOGO)
  - Coupon: code=`BIRALBIRBEDAVA`, discountType=`BOGO`, status=`ACTIVE`.
  - Rule: scopeType=`CATEGORY`, scopeValueId=`<anahtarlık-kategori-id>`, bogoBuyQty=1, bogoGetQty=1, bogoSameItemOnly=false, bogoTargetScope=`SAME_CATEGORY`.
- “Bu kod ile Anahtarlık kategorisinde 100 TL indirim”
  - Coupon: code=`ANAHTARLIK100`, discountType=`AMOUNT`, amountFixed=100, currency=`TRY`, status=`ACTIVE`, maxDiscount=100.
  - Rule: scopeType=`CATEGORY`, scopeValueId=`<anahtarlık-kategori-id>`, minAmount=0.

## Teknik Notlar
- Mevcut çoklu para birimi ve KDV ayarları: `server-currency` ve `systemSetting` (showInclVat, vatRate) ile uyumlu hesaplama.
- Variant grup uyumluluğu: BOGO eşlemesinde `variantGroupId` dikkate alınabilir (aynı ürün grubu).

## Beklenen Çıktılar
- Admin’de tam fonksiyonel kupon yönetimi.
- Müşteri tarafında kupon kodu ile kampanya uygulama.
- BOGO ve tutar/yüzde indirimleri için doğru hesaplama ve raporlama.

Hazırsanız, bu plana göre aşamalı olarak uygulamaya başlayayım. Onayınız sonrası, önce veri şemasını ve temel API’leri ekleyip, ardından UI ve hesaplama motorunu devreye alacağım.