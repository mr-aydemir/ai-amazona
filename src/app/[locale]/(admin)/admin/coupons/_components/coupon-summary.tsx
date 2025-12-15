"use client"

export default function CouponSummary({ coupon }: { coupon: any }) {
  if (!coupon) return null
  const parts: string[] = []
  const code = String(coupon.code || '').toUpperCase()
  const type = String(coupon.discountType || '')
  const status = String(coupon.status || '')
  const amtFixed = coupon.amountFixed
  const amtPct = coupon.amountPercent
  const startsAt = coupon.startsAt ? new Date(coupon.startsAt) : null
  const endsAt = coupon.endsAt ? new Date(coupon.endsAt) : null
  const usageLimit = coupon.usageLimit
  const perUserLimit = coupon.perUserLimit
  const rules = Array.isArray(coupon.rules) ? coupon.rules : []

  const fmtDate = (d: Date | null) => (d ? d.toLocaleString('tr-TR') : null)

  // Discount sentence
  if (type === 'AMOUNT' && typeof amtFixed === 'number') {
    parts.push(`${code}: Sepetten ${amtFixed} ${coupon.currency || 'TRY'} indirim sağlar`)
  } else if (type === 'PERCENT' && typeof amtPct === 'number') {
    parts.push(`${code}: Sepette %${amtPct} indirim sağlar`)
  } else if (type === 'BOGO') {
    const bogo = rules.find((r: any) => r.bogoBuyQty && r.bogoGetQty)
    if (bogo) {
      const scopeTxt = bogo.scopeType === 'CATEGORY' ? 'aynı kategori içinde' : (bogo.scopeType === 'PRODUCT' ? 'aynı ürün için' : 'sepet kapsamında')
      parts.push(`${code}: ${bogo.bogoBuyQty} al ${bogo.bogoGetQty} bedava (${scopeTxt})`)
    } else {
      parts.push(`${code}: BOGO kampanyası`)
    }
  }

  // Scope sentence
  const scopeRule = rules.find((r: any) => r.scopeType === 'CATEGORY' || r.scopeType === 'PRODUCT' || r.scopeType === 'CART_TOTAL')
  if (scopeRule) {
    if (scopeRule.scopeType === 'CATEGORY' && scopeRule.scopeValueId) {
      parts.push(`Kapsam: Kategori ${scopeRule.scopeValueId}`)
    } else if (scopeRule.scopeType === 'PRODUCT' && scopeRule.scopeValueId) {
      parts.push(`Kapsam: Ürün ${scopeRule.scopeValueId}`)
    } else {
      parts.push('Kapsam: Sepet Toplamı')
    }
  }

  // Thresholds
  const thresholds = rules.filter((r: any) => r.minQty || r.minAmount)
  if (thresholds.length > 0) {
    const th = thresholds[0]
    const thParts: string[] = []
    if (th.minQty) thParts.push(`Minimum adet ${th.minQty}`)
    if (th.minAmount) thParts.push(`Minimum tutar ${th.minAmount}`)
    parts.push(`Eşikler: ${thParts.join(', ')}`)
  }

  // Limits
  const lim: string[] = []
  if (typeof usageLimit === 'number') lim.push(`Toplam kullanım limiti ${usageLimit}`)
  if (typeof perUserLimit === 'number') lim.push(`Kişi başı limit ${perUserLimit}`)
  if (lim.length > 0) parts.push(lim.join(' · '))

  // Dates
  const time: string[] = []
  if (startsAt) time.push(`Başlangıç ${fmtDate(startsAt)}`)
  if (endsAt) time.push(`Bitiş ${fmtDate(endsAt)}`)
  if (time.length > 0) parts.push(time.join(' · '))

  parts.push(`Durum: ${status}`)

  return (
    <div className="text-xs text-muted-foreground">{parts.join(' — ')}</div>
  )
}

