'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale, useTranslations } from 'next-intl'

export default function AdminCustomersInsightsPage() {
  const t = useTranslations('admin.analytics.customers')
  const locale = useLocale()
  const [from, setFrom] = useState<string>(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  const [to, setTo] = useState<string>(() => new Date().toISOString())
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day')
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState<{ newCount: number, returningCount: number } | null>(null)
  const [acq, setAcq] = useState<Array<{ period: string, count: number }>>([])
  const [tops, setTops] = useState<Array<{ userId: string, name: string | null, email: string | null, revenue: number, orders: number }>>([])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const qs = (params: Record<string, string>) => new URLSearchParams(params).toString()
      const base = `/${locale}/admin/analytics`
      const r1 = await fetch(`/api/admin/analytics/customers/new-vs-returning?${qs({ from, to })}`)
      const j1 = await r1.json()
      setCounts({ newCount: j1.newCount ?? 0, returningCount: j1.returningCount ?? 0 })

      const r2 = await fetch(`/api/admin/analytics/customers/acquisition?${qs({ from, to, granularity })}`)
      const j2 = await r2.json()
      setAcq(Array.isArray(j2.buckets) ? j2.buckets : [])

      const r3 = await fetch(`/api/admin/analytics/customers/top?${qs({ from, to, limit: '10' })}`)
      const j3 = await r3.json()
      setTops(Array.isArray(j3.customers) ? j3.customers : [])
    } catch (e) {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6'>
      <div className='flex items-center gap-3'>
        <div>
          <label className='text-sm'>{t('from')}</label>
          <input type='datetime-local' value={from.slice(0, 16)} onChange={(e) => setFrom(new Date(e.target.value).toISOString())} className='border rounded px-2 py-1 ml-2' />
        </div>
        <div>
          <label className='text-sm'>{t('to')}</label>
          <input type='datetime-local' value={to.slice(0, 16)} onChange={(e) => setTo(new Date(e.target.value).toISOString())} className='border rounded px-2 py-1 ml-2' />
        </div>
        <div>
          <label className='text-sm'>{t('granularity')}</label>
          <select value={granularity} onChange={(e) => setGranularity(e.target.value as any)} className='border rounded px-2 py-1 ml-2'>
            <option value='day'>{t('granularity_day')}</option>
            <option value='week'>{t('granularity_week')}</option>
            <option value='month'>{t('granularity_month')}</option>
          </select>
        </div>
        <Button onClick={fetchAll} disabled={loading}>{loading ? t('refreshing') : t('refresh')}</Button>
      </div>

      <section className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className='border rounded p-4'>
          <h2 className='text-lg font-semibold mb-2'>{t('new_vs_returning')}</h2>
          <div className='text-sm'>
            <div>{t('new_customers')}: <span className='font-semibold'>{counts?.newCount ?? 0}</span></div>
            <div>{t('returning_customers')}: <span className='font-semibold'>{counts?.returningCount ?? 0}</span></div>
          </div>
        </div>
        <div className='border rounded p-4 md:col-span-2'>
          <h2 className='text-lg font-semibold mb-2'>{t('acquisition')}</h2>
          <div className='text-sm space-y-1'>
            {acq.length === 0 ? (
              <div>{t('no_data')}</div>
            ) : acq.map((b) => (
              <div key={b.period} className='flex justify-between'><span>{b.period}</span><span className='font-semibold'>{b.count}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className='border rounded p-4'>
        <h2 className='text-lg font-semibold mb-2'>{t('top_customers')}</h2>
        <div className='overflow-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='text-left'>
                <th className='p-2'>{t('customer')}</th>
                <th className='p-2'>{t('orders')}</th>
                <th className='p-2'>{t('revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {tops.length === 0 ? (
                <tr><td className='p-2' colSpan={3}>{t('no_data')}</td></tr>
              ) : tops.map((c) => (
                <tr key={c.userId}>
                  <td className='p-2'>{c.name || c.email || c.userId}</td>
                  <td className='p-2'>{c.orders}</td>
                  <td className='p-2'>{c.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}