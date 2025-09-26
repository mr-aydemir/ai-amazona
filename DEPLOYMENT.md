# Vercel Deployment Rehberi

Bu rehber, AI Amazona e-ticaret projesini Vercel'e deploy etmek için gerekli adımları içerir.

## Ön Hazırlık

### 1. Veritabanı Kurulumu
Production için PostgreSQL veritabanı gereklidir. Önerilen servisler:
- **Neon** (Ücretsiz tier mevcut)
- **Supabase** (Ücretsiz tier mevcut)
- **PlanetScale** (MySQL alternatifi)

### 2. İyzico Ayarları
- İyzico hesabınızda **Production** moduna geçin
- Production API anahtarlarınızı alın
- Callback URL'ini güncelleyin: `https://your-domain.vercel.app/api/iyzico/callback`

## Vercel Deployment Adımları

### 1. Vercel Hesabı ve Proje Kurulumu
```bash
# Vercel CLI kurulumu (opsiyonel)
npm i -g vercel

# Proje klasöründe
vercel login
vercel
```

### 2. Environment Variables Ayarlama
Vercel Dashboard'da Project Settings > Environment Variables bölümünden aşağıdaki değişkenleri ekleyin:

#### Gerekli Environment Variables:
```
DATABASE_URL=postgresql://username:password@host:port/database
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-min
NEXTAUTH_URL=https://your-domain.vercel.app
IYZICO_API_KEY=your-production-api-key
IYZICO_SECRET_KEY=your-production-secret-key
IYZICO_BASE_URL=https://api.iyzipay.com
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
RESEND_API_KEY=your-resend-api-key
UPLOADTHING_SECRET=your-uploadthing-secret
UPLOADTHING_APP_ID=your-uploadthing-app-id
ADMIN_EMAIL=admin@yourdomain.com
```

### 3. OAuth Ayarları

#### Google OAuth:
- [Google Cloud Console](https://console.cloud.google.com/)
- Authorized redirect URIs: `https://your-domain.vercel.app/api/auth/callback/google`

#### GitHub OAuth:
- [GitHub Developer Settings](https://github.com/settings/developers)
- Authorization callback URL: `https://your-domain.vercel.app/api/auth/callback/github`

### 4. Veritabanı Migration
```bash
# Production veritabanına migration çalıştırma
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

### 5. Domain Ayarları
- Vercel Dashboard'da custom domain ekleyin
- DNS ayarlarını yapın
- SSL sertifikası otomatik olarak oluşturulacak

## Deployment Sonrası Kontroller

### 1. Fonksiyon Testleri
- [ ] Kullanıcı kayıt/giriş
- [ ] Ürün listeleme
- [ ] Sepet işlemleri
- [ ] İyzico ödeme süreci
- [ ] Admin paneli erişimi

### 2. Performance Optimizasyonu
- [ ] Image optimization kontrol
- [ ] API response times
- [ ] Database query optimization

### 3. Monitoring
- Vercel Analytics aktif edin
- Error tracking için Sentry entegrasyonu (opsiyonel)

## Önemli Notlar

1. **İyzico Callback URL**: Production'da mutlaka `https://your-domain.vercel.app/api/iyzico/callback` olarak güncelleyin
2. **NEXTAUTH_URL**: Production domain'inizi tam olarak yazın
3. **Database**: Development'ta SQLite kullanıyorsanız, production'da PostgreSQL'e geçin
4. **API Keys**: Tüm API anahtarlarının production versiyonlarını kullanın

## Sorun Giderme

### Yaygın Hatalar:
1. **Invalid signature (İyzico)**: Callback URL'in doğru olduğundan emin olun
2. **Database connection**: DATABASE_URL'in doğru formatda olduğunu kontrol edin
3. **OAuth errors**: Redirect URI'ların tam olarak eşleştiğinden emin olun

### Log Kontrolü:
```bash
# Vercel function logs
vercel logs your-project-name
```

## Güvenlik Kontrol Listesi

- [ ] Tüm environment variables production değerleri
- [ ] API anahtarları güvenli
- [ ] Database erişimi kısıtlı
- [ ] HTTPS zorunlu
- [ ] CORS ayarları doğru
- [ ] Rate limiting aktif (opsiyonel)

## Backup Stratejisi

1. **Veritabanı**: Günlük otomatik backup
2. **Environment Variables**: Güvenli yerde saklayın
3. **Code**: Git repository backup

---

Bu rehberi takip ederek projenizi başarıyla Vercel'e deploy edebilirsiniz. Herhangi bir sorun yaşarsanız, Vercel documentation'ını kontrol edin.