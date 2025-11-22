## Amaç
- Admin paneline “Customer Insights” bölümü eklemek: Yeni vs Dönen Müşteriler, Müşteri Kazanımı Grafiği ve Gelire Göre En İyi Müşteriler. Ürün yorumları ve soru sorma mevcut olduğundan, müşteri etkileşimi perspektifine destek olarak bu üç metrik uygulanacak.

## Veri Tanımları
- Yeni müşteri: İlk siparişi (MIN(order.createdAt)) seçilen tarih aralığında olan kullanıcı
- Dönen müşteri: İlk siparişi aralıktan önce olup aralık içinde en az bir siparişi olan kullanıcı
- Kazanım: Aralıkta ilk siparişini veren kullanıcılar; gün/hafta/ay bucket’lanmış sayılar
- Top müşteriler: Aralıkta `PAID`/`COMPLETED` durumlu siparişlerin toplam tutarına göre sıralama

## Backend API (Sadece ADMIN)
- Ortak sorgu parametreleri: `from`, `to` (ISO), `granularity` (`day|week|month`), `limit` (varsayılan 10)
- Yetki: `auth()` ile `session.user.role === 'ADMIN'` doğrulaması
- Uçlar:
  1) `GET /api/admin/analytics/customers/new-vs-returning?from&to`
     - Her `userId` için ilk sipariş tarihini hesapla; yeni vs dönen sayıları döndür
     - Yanıt: `{ newCount, returningCount }`
  2) `GET /api/admin/analytics/customers/acquisition?from&to&granularity=day|week|month`
     - Aralıkta ilk siparişi olan kullanıcıları granularity’e göre bucket’la
     - Yanıt: `{ buckets: [{ period, count }...] }`
  3) `GET /api/admin/analytics/customers/top?from&to&limit=10`
     - Aralıkta `PAID`/`COMPLETED` siparişlerden `SUM(total)` ve `COUNT(*)` per `userId`
     - Yanıt: `[ { userId, name/email, revenue, orders } ]`
- Performans: `Order(userId, createdAt)` ve `Order(status)` indekslerini kullan; gerekirse raw SQL; 5–15 dk server-side cache

## Frontend (Admin)
- Sayfa: `src/app/[locale]/(admin)/admin/analytics/customers/page.tsx`
- Bileşenler:
  - “Yeni vs Dönen” donut/pie grafik + sayılar
  - “Kazanım” çizgi/bar grafik; granularity seçici (gün/hafta/ay)
  - “Top Customers” tablo (ad/e‑posta, sipariş sayısı, toplam gelir)
- Filtreler: Tarih aralığı (date picker), periyot seçimi; CSV export
- i18n: `messages/tr/admin.analytics.customers.*` ve EN karşılıkları

## Teknik Notlar
- Para birimi: Sipariş `total` baz para birimindeyse direkt; gerekirse `convertServer()` ile görüntü para birimine çeviri
- Durum filtreleri: `PAID` ve `COMPLETED`; `CANCELLED`/`REFUNDED` hariç
- Zaman: Sunucu UTC; UI locale/timezone biçimleme
- Güvenlik: Sadece ADMIN erişimi; basit rate-limit

## Test ve Doğrulama
- Seed: Farklı tarihlerde siparişleri olan 5 yeni ve 7 dönen müşteri
- API birim testleri: boş veri, yoğun veri, yanlış parametre
- UI smoke: grafikler ve tablo render; filtreler çalışıyor

## Entegrasyon Adımları
1) Üç API ucu ve yetki kontrolü
2) Sorgular ve aggregation; cache ekle
3) Admin Customers Insights sayfası ve grafik/tablolar
4) i18n metinleri
5) Test ve örnek veri ile doğrulama

Onayınızla birlikte implementasyona başlayacağım.