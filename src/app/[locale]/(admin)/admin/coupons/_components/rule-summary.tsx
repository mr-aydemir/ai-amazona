"use client"

export default function RuleSummary({ rule }: { rule: any }) {
  if (!rule) return null
  const parts: string[] = []
  const scopeType = String(rule.scopeType || '')
  const scopeId = rule.scopeValueId ? String(rule.scopeValueId) : ''
  if (scopeType === 'CATEGORY') parts.push(`Kategori ${scopeId}`)
  else if (scopeType === 'PRODUCT') parts.push(`Ürün ${scopeId}`)
  else parts.push('Sepet Toplamı')
  if (rule.minQty) parts.push(`Min adet ${rule.minQty}`)
  if (rule.minAmount) parts.push(`Min tutar ${rule.minAmount}`)
  if (rule.group) parts.push(`Grup ${rule.group} (${rule.groupOp || 'OR'})`)
  if (rule.bogoBuyQty && rule.bogoGetQty) parts.push(`${rule.bogoBuyQty} al ${rule.bogoGetQty} bedava`)
  return <div className="text-[11px] text-muted-foreground">{parts.join(' — ')}</div>
}

