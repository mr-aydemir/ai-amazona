"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function CouponBuilder() {
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENT' | 'BOGO'>('AMOUNT')
  const [amountFixed, setAmountFixed] = useState('')
  const [amountPercent, setAmountPercent] = useState('')
  const [scopeType, setScopeType] = useState<'CATEGORY' | 'PRODUCT' | 'CART_TOTAL'>('CART_TOTAL')
  const [scopeValueId, setScopeValueId] = useState('')
  const [minQty, setMinQty] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [group, setGroup] = useState('1')
  const [groupOp, setGroupOp] = useState<'AND' | 'OR'>('OR')
  const [bogoBuyQty, setBogoBuyQty] = useState('1')
  const [bogoGetQty, setBogoGetQty] = useState('1')
  const [creating, setCreating] = useState(false)
  const [info, setInfo] = useState<string>('')
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const catRes = await fetch('/api/admin/categories')
        const prodRes = await fetch('/api/admin/products/list')
        const cats = await catRes.json().catch(() => [])
        const prods = await prodRes.json().catch(() => ({ items: [] }))
        setCategories(Array.isArray(cats) ? cats : [])
        setProducts(Array.isArray(prods?.items) ? prods.items : [])
      } catch {}
    })()
  }, [])

  const buildInfo = () => {
    const parts: string[] = []
    const codeUp = code.trim().toUpperCase() || 'KUpon'
    if (discountType === 'AMOUNT' && amountFixed) parts.push(`${codeUp}: Sepetten ${amountFixed} indirim`)
    if (discountType === 'PERCENT' && amountPercent) parts.push(`${codeUp}: Sepette %${amountPercent} indirim`)
    if (discountType === 'BOGO') parts.push(`${codeUp}: ${bogoBuyQty} al ${bogoGetQty} bedava`)
    if (scopeType === 'CATEGORY' && scopeValueId) parts.push(`Kapsam kategori ${scopeValueId}`)
    if (scopeType === 'PRODUCT' && scopeValueId) parts.push(`Kapsam ürün ${scopeValueId}`)
    if (scopeType === 'CART_TOTAL') parts.push('Kapsam sepet toplamı')
    if (minQty) parts.push(`Min adet ${minQty}`)
    if (minAmount) parts.push(`Min tutar ${minAmount}`)
    parts.push(`Grup ${group} (${groupOp})`)
    setInfo(parts.join(' — '))
  }

  useEffect(() => { buildInfo() }, [code, discountType, amountFixed, amountPercent, scopeType, scopeValueId, minQty, minAmount, group, groupOp, bogoBuyQty, bogoGetQty])

  const create = async () => {
    try {
      setCreating(true)
      const fd = new FormData()
      fd.set('code', code)
      fd.set('discountType', discountType)
      if (discountType === 'AMOUNT') fd.set('amountFixed', amountFixed)
      if (discountType === 'PERCENT') fd.set('amountPercent', amountPercent)
      const res = await fetch('/api/admin/coupons', { method: 'POST', body: fd })
      const coupon = await res.json()
      if (!res.ok) throw new Error(coupon?.error || 'Oluşturma hatası')
      const rule = {
        scopeType,
        scopeValueId: scopeValueId || null,
        minQty: minQty ? parseInt(minQty) : null,
        minAmount: minAmount ? parseFloat(minAmount) : null,
        group: group ? parseInt(group) : null,
        groupOp,
        ...(discountType === 'BOGO' ? { bogoBuyQty: parseInt(bogoBuyQty), bogoGetQty: parseInt(bogoGetQty) } : {}),
      }
      const rRes = await fetch(`/api/admin/coupons/${coupon.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules: [rule] }) })
      if (!rRes.ok) {
        const j = await rRes.json().catch(() => ({}))
        throw new Error(j?.error || 'Kural kaydı hatası')
      }
      alert('Kupon oluşturuldu')
    } catch (e: any) {
      alert(e?.message || 'Hata')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-base font-semibold">Bloklarla Kupon Oluştur</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm font-medium">Kod</div>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Örn: ANAHTARLIK100" />
          <div className="text-sm font-medium">İndirim Tipi</div>
          <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="border rounded px-2 py-1">
            <option value="AMOUNT">Tutar</option>
            <option value="PERCENT">Yüzde</option>
            <option value="BOGO">BOGO</option>
          </select>
          {discountType === 'AMOUNT' && (<Input value={amountFixed} onChange={(e) => setAmountFixed(e.target.value)} placeholder="Tutar" />)}
          {discountType === 'PERCENT' && (<Input value={amountPercent} onChange={(e) => setAmountPercent(e.target.value)} placeholder="Yüzde" />)}
          {discountType === 'BOGO' && (
            <div className="grid grid-cols-2 gap-2">
              <Input value={bogoBuyQty} onChange={(e) => setBogoBuyQty(e.target.value)} placeholder="X (Al)" />
              <Input value={bogoGetQty} onChange={(e) => setBogoGetQty(e.target.value)} placeholder="Y (Bedava)" />
            </div>
          )}
        </div>
        <div className="border rounded p-3 space-y-2">
          <div className="text-sm font-medium">Kapsam</div>
          <select value={scopeType} onChange={(e) => setScopeType(e.target.value as any)} className="border rounded px-2 py-1">
            <option value="CART_TOTAL">Sepet Toplamı</option>
            <option value="CATEGORY">Kategori</option>
            <option value="PRODUCT">Ürün</option>
          </select>
          {scopeType === 'CATEGORY' && (
            <select value={scopeValueId} onChange={(e) => setScopeValueId(e.target.value)} className="border rounded px-2 py-1">
              <option value="">Seçiniz</option>
              {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.name || c.id}</option>))}
            </select>
          )}
          {scopeType === 'PRODUCT' && (
            <select value={scopeValueId} onChange={(e) => setScopeValueId(e.target.value)} className="border rounded px-2 py-1">
              <option value="">Seçiniz</option>
              {products.map((p: any) => (<option key={p.id} value={p.id}>{p.name || p.id}</option>))}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input value={minQty} onChange={(e) => setMinQty(e.target.value)} placeholder="Min Adet" />
            <Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Min Tutar" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Grup" />
            <select value={groupOp} onChange={(e) => setGroupOp(e.target.value as any)} className="border rounded px-2 py-1">
              <option value="OR">OR</option>
              <option value="AND">AND</option>
            </select>
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Özet: {info}</div>
      <div className="flex justify-end"><Button onClick={create} disabled={creating || !code.trim()}>Oluştur</Button></div>
    </div>
  )
}

