# Hivhestın AI Proxy (Cloudflare Worker)

Admin panelindeki blog taslak üretimi OpenRouter'a **bu Worker üzerinden** gider.
Böylece OpenRouter anahtarı tarayıcıya ve Vercel'e gitmez.

## Kurulum

```bash
cd cloudflare/ai-proxy
npm install
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
# opsiyonel: tarayıcıdan gelen paylaşılan token
npx wrangler secret put PROXY_TOKEN
npx wrangler deploy
```

Deploy çıktısındaki Worker URL'ini not al, örneğin:
`https://hivhestin-ai-proxy.<subdomain>.workers.dev`

## Site tarafı

Vercel → Settings → Environment Variables:

```env
NEXT_PUBLIC_AI_PROXY_URL=https://hivhestin-ai-proxy.<subdomain>.workers.dev
NEXT_PUBLIC_AI_PROXY_TOKEN=<PROXY_TOKEN ile aynı değer>  # opsiyonel
```

Yerelde `.env.local` içine aynı değerleri ekle. Sonra siteyi yeniden deploy et.

## Güvenlik

- `ALLOWED_ORIGINS` yalnızca site ve localhost'a izin verir.
- `PROXY_TOKEN` ayarlarsan isteklerde `X-Proxy-Token` zorunlu olur.
- Sadece izin verilen ücretsiz modeller kabul edilir.
- İstek boyutu, mesaj sayısı ve `max_tokens` sınırlandırılmıştır.
- Cloudflare panelinden rate limiting kuralı eklemen önerilir.

## Notlar

- Worker ücretsiz planı günde 100.000 isteğe kadar yeterlidir; blog üretimi
  düşük hacimli olduğu için tüketim minimal olur.
- OpenRouter anahtarını Worker secret olarak tut; repoya yazma.
