'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PackageSearch, User2, MapPin, CreditCard } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

export function DashboardNav() {
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('common.navigation')

  const routes = [
    {
      label: t('orders'),
      icon: PackageSearch,
      href: `/${locale}/dashboard/orders`,
      color: 'text-sky-500',
    },
    {
      label: t('profile'),
      icon: User2,
      href: `/${locale}/dashboard/profile`,
      color: 'text-violet-500',
    },
    {
      label: t('addresses'),
      icon: MapPin,
      href: `/${locale}/dashboard/addresses`,
      color: 'text-pink-700',
    },
    {
      label: t('cards'),
      icon: CreditCard,
      href: `/${locale}/dashboard/cards`,
      color: 'text-emerald-600',
    },
  ] as const

  return (
    <nav className='flex flex-col space-y-2'>
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            'flex items-center gap-x-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
            pathname === route.href ? 'bg-accent' : 'transparent'
          )}
        >
          <route.icon className={cn('h-5 w-5', route.color)} />
          {route.label}
        </Link>
      ))}
    </nav>
  )
}
