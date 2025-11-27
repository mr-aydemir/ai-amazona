"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import RuleEditor from './rule-editor'

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

  return (
    <div className="space-y-4">
      <div className="text-xl font-semibold">Kuponlar</div>
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
              </div>
              <div className="flex gap-2">
                <RuleEditor coupon={c} />
                <form action={`/api/admin/coupons/${c.id}`} method="post">
                  <Button type="submit" formMethod="delete" variant="outline">Sil</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
