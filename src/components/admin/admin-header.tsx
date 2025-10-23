'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTranslations, useLocale } from 'next-intl'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  BarChart,
  ShoppingBag,
  FolderOpen,
  FileText,
  Heart,
} from 'lucide-react'

export function AdminHeader() {
  const pathname = usePathname()
  const t = useTranslations('admin.navigation')
  const locale = useLocale()

  const navigation = [
    { name: t('dashboard'), href: `/${locale}/admin`, icon: LayoutDashboard },
    { name: t('analytics'), href: `/${locale}/admin/analytics`, icon: BarChart },
    { name: t('products'), href: `/${locale}/admin/products`, icon: Package },
    { name: "Trendyol'a Ürün Ekle", href: `/${locale}/admin/trendyol-add`, icon: Package },
    { name: 'Trendyol İçe Aktar', href: `/${locale}/admin/trendyol-import`, icon: Package },
    { name: t('categories'), href: `/${locale}/admin/categories`, icon: FolderOpen },
    { name: t('orders'), href: `/${locale}/admin/orders`, icon: ShoppingCart },
    { name: t('carts'), href: `/${locale}/admin/carts`, icon: ShoppingCart },
    { name: t('customers'), href: `/${locale}/admin/customers`, icon: Users },
    { name: t('favorites'), href: `/${locale}/admin/favorites`, icon: Heart },
    { name: t('banners'), href: `/${locale}/admin/banners`, icon: LayoutDashboard },
    { name: t('contact'), href: `/${locale}/admin/contact`, icon: LayoutDashboard },
    { name: t('about', { defaultMessage: (locale === 'tr' ? 'Hakkımızda' : 'About') }), href: `/${locale}/admin/about`, icon: FileText },
    { name: 'Mesajlar', href: `/${locale}/admin/contact/messages`, icon: LayoutDashboard },
    { name: t('settings'), href: `/${locale}/admin/settings`, icon: Settings },
  ]

  return (
    <header className='border-b bg-card'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo and Navigation */}
          <div className='flex items-center gap-8'>
            <div className='flex items-center gap-6'>
              <Link
                href={`/${locale}`}
                className='flex items-center gap-2 text-xl font-bold'
              >
                <ShoppingBag className='h-6 w-6' />
                <span>Hivhestın</span>
              </Link>
              <div className='h-6 w-px bg-border' />
              <Link href={`/${locale}/admin`} className='text-muted-foreground hover:text-foreground transition-colors'>
                {t('admin')}
              </Link>
            </div>

            {/* Navigation */}
            <nav className='hidden md:flex items-center gap-6'>
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <item.icon className='h-4 w-4' />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}
