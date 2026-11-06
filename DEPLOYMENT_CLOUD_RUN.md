# Google Cloud Run Deployment

Bu proje `output: 'standalone'` ile derlenir ve `Dockerfile` üzerinden Cloud Run'a deploy edilir.
Proje içinde `vercel.json` kalmıştır; Cloud Run bu dosyayı okumaz (rewrite/headers/cron ayarları
`next.config.ts` ve `.github/workflows/currency-cron.yml` içine taşındı).

## 1. Ön koşullar

- Google Cloud hesabı + faturalandırma hesabı (ücretsiz kota için kart gerekir, aylık limite kadar ücret alınmaz)
- `gcloud` CLI
- Neon bağlantısında **pooler** adresi (`...-pooler...`) kullanılmalı

```bash
gcloud auth login
gcloud config set project PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

## 2. İmajı oluştur

```bash
gcloud artifacts repositories create hivhestin --repository-format=docker \
  --location=europe-west1 --description="Hivhestin shop"

gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_NEXT_PUBLIC_SITE_URL=https://shop.example.com,_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

`NEXT_PUBLIC_*` değerleri client bundle'a build sırasında gömülür; bu yüzden `cloudbuild.yaml`
üzerinden geçirilir. Build sırasında veritabanı erişimi gerekmez (doğrulandı); `.env` dosyaları
`.dockerignore` ile imaja dahil edilmez.

## 3. Ortam değişkenleri

Hazır env dosyası: `.env.production.yaml` (gitignore'da, imaja dahil edilmez) doğrudan verilebilir:

```bash
gcloud run deploy hivhestin \
  --image europe-west1-docker.pkg.dev/PROJECT_ID/hivhestin/app:latest \
  --env-vars-file .env.production.yaml \
  --region europe-west1 --port 8080 --allow-unauthenticated
```

Hassas değerleri Secret Manager'da tutmak isterseniz aşağıdaki örneği kullanın:

```bash
gcloud run deploy hivhestin \
  --image europe-west1-docker.pkg.dev/PROJECT_ID/hivhestin/app:latest \
  --region europe-west1 \
  --port 8080 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars NODE_ENV=production,NEXTAUTH_URL=https://shop.example.com \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,...
```

Gerekli değişkenler:

| Değişken | Not |
|---|---|
| `DATABASE_URL` | Neon **pooler** adresi |
| `NEXTAUTH_URL` | Cloud Run/custom domain URL'i |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | En az 32 karakter |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | OAuth callback yeni domain olmalı |
| `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL` | Callback URL yeni domain olmalı |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | Gmail SMTP 587 Cloud Run'da açık |
| `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID`, `UPLOADTHING_TOKEN` | |
| `TRENDYOL_SUPPLIER_ID`, `TRENDYOL_API_KEY`, `TRENDYOL_API_SECRET` | |
| `ARAS_KARGO_USERNAME`, `ARAS_KARGO_PASSWORD`, `ARAS_KARGO_API_URL` | |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Kullanılıyorsa |

`NEXT_PUBLIC_*` değişkenleri **build sırasında** gömülür; değeri değişince imajı yeniden build edin:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_NEXT_PUBLIC_SITE_URL=https://shop.example.com,_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

`STRIPE_SECRET_KEY` artık yalnızca çalışma zamanında okunur (lazy init), build'e gerekmez.

## 4. Domain ve callback URL'leri

1. Cloud Run > Domain mappings ile custom domain bağla (veya global load balancer).
2. `NEXTAUTH_URL` değerini yeni domain yap.
3. Google/GitHub OAuth callback: `https://YOUR_DOMAIN/api/auth/callback/google` vb.
4. İyzico callback: `https://YOUR_DOMAIN/api/iyzico/callback` (3DS: `/api/iyzico/3ds-callback`).

## 5. Cron

Vercel cron'u kaldırıldı. `.github/workflows/currency-cron.yml` her gün 00:00'da
`/api/admin/currency/cron` adresini çağırır. Repo secret olarak `APP_URL` ekleyin.
GitHub kullanmıyorsanız cron-job.org gibi bir servisle aynı endpoint'i çağırabilirsiniz.

## 6. Şema / migration

Veritabanı Supabase'e (`aws-1-eu-central-1`) taşındı; Neon dump'ı restore edildi,
30 migration uygulandı ve `prisma migrate status` temiz. Neon'a özel `neon_auth` şeması
restore edilmedi.

Uygulama imajı migration çalıştırmaz. Şema değiştiğinde:

```bash
npx prisma migrate deploy   # yerelden, DATABASE_URL production'a bakacak şekilde
```

## 7. Kontrol listesi

- [ ] `/` → `/tr` yönlendirmesi çalışıyor
- [ ] `/api/auth/session` 200 dönüyor
- [ ] Kayıt/şifre sıfırlama e-postası gidiyor (Gmail SMTP)
- [ ] Ürün görselleri `next/image` ile yükleniyor (`sharp` imajda mevcut)
- [ ] İyzico ödeme + 3DS callback çalışıyor
- [ ] Admin panelinden UploadThing yükleme/silme çalışıyor
- [ ] Günlük kur cron'u çalışıyor
