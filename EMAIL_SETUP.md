# E-posta Yapılandırması - Parola Sıfırlama

Bu dokümanda parola sıfırlama özelliği için gerekli e-posta yapılandırması açıklanmaktadır.

## Gerekli Environment Değişkenleri

Parola sıfırlama e-postalarının gönderilmesi için aşağıdaki environment değişkenlerini `.env.local` dosyanızda tanımlamanız gerekiyor:

### 1. RESEND_API_KEY
```env
RESEND_API_KEY="your_resend_api_key_here"
```

**Nasıl alınır:**
1. [Resend.com](https://resend.com) sitesine gidin
2. Hesap oluşturun veya giriş yapın
3. Dashboard'da "API Keys" bölümüne gidin
4. "Create API Key" butonuna tıklayın
5. API key'inizi kopyalayın ve yukarıdaki değişkene yapıştırın

### 2. FROM_EMAIL
```env
FROM_EMAIL="noreply@yourdomain.com"
```

**Açıklama:**
- E-postaların hangi adresden gönderileceğini belirtir
- Kendi domain'inizin e-posta adresini kullanın
- Örnek: `noreply@mystore.com`, `support@mycompany.com`
- Resend'de domain doğrulaması yapmanız gerekebilir

### 3. NEXTAUTH_URL
```env
NEXTAUTH_URL="http://localhost:3000"
```

**Açıklama:**
- Parola sıfırlama linklerinde kullanılacak base URL
- Development için: `http://localhost:3000`
- Production için: `https://yourdomain.com`

## Resend Domain Doğrulaması

Profesyonel e-posta gönderimi için domain doğrulaması yapmanız önerilir:

1. Resend Dashboard'da "Domains" bölümüne gidin
2. "Add Domain" butonuna tıklayın
3. Domain'inizi girin (örnek: `mystore.com`)
4. Verilen DNS kayıtlarını domain sağlayıcınızda ekleyin:
   - SPF kaydı
   - DKIM kaydı
   - DMARC kaydı (opsiyonel)
5. Doğrulama tamamlandıktan sonra `FROM_EMAIL` değişkenini güncelleyin

## Test Etme

Yapılandırma tamamlandıktan sonra:

1. Development server'ı yeniden başlatın: `npm run dev`
2. `/auth/forgot-password` sayfasına gidin
3. Geçerli bir e-posta adresi girin
4. E-posta kutunuzu kontrol edin

## Güvenlik Notları

- API key'lerinizi asla public repository'lerde paylaşmayın
- Production'da güçlü API key'ler kullanın
- E-posta rate limiting'i uygulayın
- HTTPS kullanın (production için)

## Sorun Giderme

### E-posta gönderilmiyor
1. RESEND_API_KEY'in doğru olduğundan emin olun
2. Resend dashboard'da API key'in aktif olduğunu kontrol edin
3. FROM_EMAIL adresinin doğrulanmış domain'de olduğunu kontrol edin

### Reset linki çalışmıyor
1. NEXTAUTH_URL'in doğru olduğundan emin olun
2. Token'ın süresi dolmamış olduğunu kontrol edin (1 saat)
3. Database'de resetToken ve resetTokenExpiry alanlarını kontrol edin

## Maliyet

Resend fiyatlandırması:
- İlk 3,000 e-posta/ay ücretsiz
- Sonrasında $20/ay 50,000 e-posta için
- Detaylar: [Resend Pricing](https://resend.com/pricing)