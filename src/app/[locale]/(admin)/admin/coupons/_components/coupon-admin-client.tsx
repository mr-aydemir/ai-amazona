"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import RuleEditor from './rule-editor'
import CouponHowItWorks from './how-it-works'
import CouponSummary from './coupon-summary'
import CouponBuilder from './coupon-builder'
import RuleSummary from './rule-summary'

export default function CouponAdminClient({ locale }: { locale: string }) {
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/coupons', { cache: 'no-store' })
      const json = await res.json().catch(() => [])
      if (!res.ok) throw new Error(json?.error || 'Yükleme hatası')
      setCoupons(Array.isArray(json) ? json : [])
    } catch (e: any) {
      setError(e?.message || 'Yükleme hatası')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError(null)
    const fd = new FormData(e.currentTarget)
    const code = String(fd.get('code') || '').trim()
    if (!code) { setError('Kod gereklidir'); return }
    try {
      const res = await fetch('/api/admin/coupons', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || (res.status === 409 ? 'Kod zaten mevcut' : 'Oluşturma hatası'))
      e.currentTarget.reset()
      await load()
    } catch (e: any) {
      setError(e?.message || 'Oluşturma hatası')
    }
  }

  const deleteCoupon = async (id: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Silinemedi')
      }
      await load()
    } catch (e: any) {
      setError(e?.message || 'Silme hatası')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Kuponlar</div>
      <CouponHowItWorks />
      <CouponBuilder />
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <Input name="code" placeholder="Kod" required />
        <select name="discountType" className="border rounded px-2 py-1">
          <option value="AMOUNT">Tutar</option>
          <option value="PERCENT">Yüzde</option>
          <option value="BOGO">BOGO</option>
        </select>
        <Input name="amountFixed" placeholder="Tutar (TL)" />
        <Input name="amountPercent" placeholder="Yüzde (%)" />
        <Input name="startsAt" type="datetime-local" />
        <Input name="endsAt" type="datetime-local" />
        <Button type="submit">Oluştur</Button>
      </form>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Yükleniyor...</div>
      ) : (
        <div className="grid gap-2">
          {coupons.length === 0 ? (
            <div className="text-sm text-muted-foreground">Kupon bulunamadı</div>
          ) : coupons.map((c: any) => (
            <div key={c.id} className="border rounded p-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.code}</div>
                <div className="text-xs text-muted-foreground">{c.discountType} · {c.status}</div>
                <CouponSummary coupon={c} />
              </div>
              <div className="flex gap-2">
                <RuleEditor coupon={c} onSaved={load} />
                <Button variant="outline" onClick={() => deleteCoupon(c.id)}>Sil</Button>
              </div>
              {Array.isArray(c.rules) && c.rules.length > 0 && (
                <div className="mt-2 space-y-1">
                  {c.rules.map((r: any, idx: number) => <RuleSummary key={idx} rule={r} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
