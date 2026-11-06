'use client'

import { useTranslations } from 'next-intl'
import { BadgePercent, ShieldCheck, Sparkles, Truck } from 'lucide-react'

const items = [
  { key: 'fast', Icon: Truck },
  { key: 'secure', Icon: ShieldCheck },
  { key: 'deals', Icon: BadgePercent },
  { key: 'special', Icon: Sparkles },
] as const

export function TrustBadges() {
  const t = useTranslations('home.trust')

  return (
    <section className='container mx-auto px-4 sm:px-6 lg:px-8'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {items.map(({ key, Icon }) => (
          <div key={key} className='flex items-center gap-3 rounded-xl border bg-card p-4'>
            <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
              <Icon className='h-5 w-5' />
            </span>
            <div className='min-w-0'>
              <p className='text-sm font-semibold'>{t(`${key}.title`)}</p>
              <p className='text-xs text-muted-foreground'>{t(`${key}.desc`)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
