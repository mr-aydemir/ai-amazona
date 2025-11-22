## Kapsam
- Admin Paneline “Customer Insights” bölümü ekleme
- Üç metrik: Yeni vs Dönen Müşteriler, Müşteri Kazanımı Grafiği, Gelire Göre En İyi Müşteriler
- Tarih aralığı ve periyot (gün/hafta/ay) filtresi, sadece ADMIN erişimi

## Veri Tanımları
- Yeni müşteri: İlk sipariş tarihi seçilen aralıkta olan kullanıcı
- Dönen müşteri: İlk siparişi seçilen aralıktan önce olup aralıkta en az bir siparişi olan kullanıcı
- Gelir: Sipariş toplam tutarı (iade/iptal hariç; `PAID`/`COMPLETED` durumları dahil)
- Kazanım: Seçilen aralıkta ilk siparişini veren kullanıcı sayısı (periyot bazlı)

## Backend (API)
- Ortak: `from`, `to` (ISO), `granularity` (day|week|month), `limit` (varsayılan 10)
- Yetki: `auth()` → `session.user.role === 'ADMIN'`
- Uçlar:
  1) `GET /api/admin/analytics/customers/new-vs-returning?from&to`
     - Sorgu:
       - `firstOrderDate = MIN(order.createdAt) GROUP BY userId`
       - Yeni: `from <= firstOrderDate <= to`
       - Dönen: `firstOrderDate < from AND COUNT(orders in [from,to]) > 0`
       - Dönen sipariş sayısı ve toplam geliri opsiyonel döndür
     - Yanıt: `{ newCount, returningCount }`
  2) `GET /api/admin/analytics/customers/acquisition?from&to&granularity=day|week|month`
     - Sorgu:
       - Her userId için `firstOrderDate` hesaplanır; belirtilen aralıkta olanlar seçilir
       - Periyoda göre bucket’lanır (gün/hafta/ay)
     - Yanıt ör.: `{ buckets: [{ period:'2025-11-01', count: 12 }, ...] }`
  3) `GET /api/admin/analytics/customers/top?from&to&limit=10`
     - Sorgu:
       - `SUM(order.total) as revenue` per userId (durum `PAID`/`COMPLETED`), aralık filtresi
       - `COUNT(*) as orders`
       - `ORDER BY revenue DESC LIMIT ?`
     - Yanıt: `[ { userId, name/email, revenue, orders }, ... ]`
- Performans:
  - İndeksler: `Order(userId, createdAt)`, `Order(status)`
  - Kümülatif hesaplar için Prisma `groupBy` veya raw SQL
  - Sonuçları 5–15 dk süreli cache (Edge yoksa server cache)

## Frontend (Admin)
- Sayfa: `src/app/[locale]/(admin)/admin/analytics/customers/page.tsx`
- Bileşenler (Recharts mevcut):
  - “Yeni vs Dönen” pasta/donut grafik + sayılar
  - “Kazanım” çizgi/bar grafik (granularity seçici)
  - “Top Customers” tablo (ad/e‑posta, sipariş sayısı, toplam gelir)
- Filtreler: tarih aralığı (datepicker), periyot seçimi, export CSV
- i18n: `messages/tr/admin.analytics.customers.*` ve EN karşılıkları

## Teknik Detaylar
- Para birimi: Sipariş toplamı sistem baz para birimi ise direkt; değilse `convertServer()` ile görsel para birimi
- Durum filtreleri: `PAID`, `COMPLETED`; `CANCELLED`, `REFUNDED` hariç
- Zaman bölgesi: Sunucu UTC; UI’de locale/timezone uyumlu gösterim
- Güvenlik: Sadece ADMIN; rate limit basit (ör. 30 req/min)

## Testler
- Seed: 5 yeni, 7 dönen müşteri; farklı tarihlerde siparişler
- API birim testleri (parametre kombinasyonları, boş veri, yoğun veri)
- UI smoke testi: Grafikleri ve tabloyu render

## Entegrasyon Adımları
1) API uçlarını ekle ve yetki kontrolünü uygula
2) Sorgular için Prisma `groupBy` ve gerekirse raw SQL
3) Admin sayfası ve bileşenlerini oluştur; filtreleri bağla
4) i18n metinleri ekle; TR/EN
5) Basit cache ve indeks kontrolü
6) Test ve örnek veri ile doğrulama

Onayınızdan sonra implementasyonu başlatıyorum.