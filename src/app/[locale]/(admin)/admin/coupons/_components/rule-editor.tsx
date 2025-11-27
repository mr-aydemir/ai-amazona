"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export default function RuleEditor({ coupon }: { coupon: any }) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>(Array.isArray(coupon?.rules) ? coupon.rules : [])
  const [scopeType, setScopeType] = useState('CATEGORY')
  const [scopeValueId, setScopeValueId] = useState('')
  const [minQty, setMinQty] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [group, setGroup] = useState('1')
  const [groupOp, setGroupOp] = useState<'AND' | 'OR'>('OR')
  const [bogoBuyQty, setBogoBuyQty] = useState('')
  const [bogoGetQty, setBogoGetQty] = useState('')
  const [bogoSameItemOnly, setBogoSameItemOnly] = useState(false)
  const [bogoTargetScope, setBogoTargetScope] = useState('SAME_CATEGORY')
  const [previewCartJson, setPreviewCartJson] = useState('{"items":[{"productId":"example","categoryId":"cat","price":100,"quantity":2}]}')
  const [previewResult, setPreviewResult] = useState<string>('')

  const preview = async () => {
    try {
      const cart = JSON.parse(previewCartJson)
      const res = await fetch('/api/coupons/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: coupon.code, cart }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Validate failed')
      setPreviewResult(`İndirim: ${json.discount}`)
    } catch (e: any) {
      setPreviewResult(`Hata: ${e?.message || 'geçersiz JSON'}`)
    }
  }

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

  const addRule = () => {
    const r: any = { scopeType }
    if (scopeValueId) r.scopeValueId = scopeValueId
    if (minQty) r.minQty = parseInt(minQty)
    if (minAmount) r.minAmount = parseFloat(minAmount)
    if (group) r.group = parseInt(group)
    r.groupOp = groupOp
    if (coupon.discountType === 'BOGO') {
      if (bogoBuyQty) r.bogoBuyQty = parseInt(bogoBuyQty)
      if (bogoGetQty) r.bogoGetQty = parseInt(bogoGetQty)
      r.bogoSameItemOnly = !!bogoSameItemOnly
      r.bogoTargetScope = bogoTargetScope
    }
    setRules(prev => [...prev, r])
  }

  const save = async () => {
    await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    })
    setOpen(false)
  }

  const removeRule = (idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Kuralları Düzenle</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{coupon.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select value={scopeType} onChange={e => setScopeType(e.target.value)} className="border rounded px-2 py-1">
                <option value="CATEGORY">Kategori</option>
                <option value="PRODUCT">Ürün</option>
                <option value="CART_TOTAL">Sepet Toplamı</option>
              </select>
              <Input placeholder="Grup" value={group} onChange={e => setGroup(e.target.value)} />
              <select value={groupOp} onChange={e => setGroupOp(e.target.value as any)} className="border rounded px-2 py-1">
                <option value="OR">Grup Bağlayıcı: OR</option>
                <option value="AND">Grup Bağlayıcı: AND</option>
              </select>
              {scopeType === 'CATEGORY' && (
                <select value={scopeValueId} onChange={e => setScopeValueId(e.target.value)} className="border rounded px-2 py-1">
                  <option value="">Seçiniz</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name || c.id}</option>
                  ))}
                </select>
              )}
              {scopeType === 'PRODUCT' && (
                <select value={scopeValueId} onChange={e => setScopeValueId(e.target.value)} className="border rounded px-2 py-1">
                  <option value="">Seçiniz</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name || p.id}</option>
                  ))}
                </select>
              )}
              <Input placeholder="Minimum Adet" value={minQty} onChange={e => setMinQty(e.target.value)} />
              <Input placeholder="Minimum Tutar" value={minAmount} onChange={e => setMinAmount(e.target.value)} />
            </div>
            {coupon.discountType === 'BOGO' && (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="X (Al)" value={bogoBuyQty} onChange={e => setBogoBuyQty(e.target.value)} />
                <Input placeholder="Y (Bedava)" value={bogoGetQty} onChange={e => setBogoGetQty(e.target.value)} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={bogoSameItemOnly} onChange={e => setBogoSameItemOnly(e.target.checked)} />
                  Aynı üründen seç
                </label>
                <select value={bogoTargetScope} onChange={e => setBogoTargetScope(e.target.value)} className="border rounded px-2 py-1">
                  <option value="SAME_CATEGORY">Aynı kategori</option>
                  <option value="SAME_PRODUCT">Aynı ürün</option>
                  <option value="ANY">Herhangi</option>
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={addRule}>Kural Ekle</Button>
              <Button variant="outline" onClick={save}>Kaydet</Button>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Önizleme (JSON Cart)</div>
              <textarea className="w-full border rounded p-2 text-xs" rows={6} value={previewCartJson} onChange={e => setPreviewCartJson(e.target.value)} />
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={preview}>Doğrula</Button>
                <div className="text-xs text-muted-foreground">{previewResult}</div>
              </div>
            </div>
            <div className="space-y-2">
              {rules.map((r: any, idx: number) => (
                <div key={idx} className="border rounded p-2 flex items-center justify-between">
                  <div className="text-sm">{r.scopeType}{r.scopeValueId ? `:${r.scopeValueId}` : ''}</div>
                  <Button variant="outline" onClick={() => removeRule(idx)}>Sil</Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
