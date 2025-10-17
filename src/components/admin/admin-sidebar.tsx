'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Upload,
} from 'lucide-react'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInput,
  SidebarCollapsible,
  useSidebar,
} from '@/components/ui/sidebar'
import Image from 'next/image'
import { useState, useMemo } from 'react'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { CurrencySelector } from '@/components/ui/currency-selector'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function AdminSidebar() {
  const pathname = usePathname()
  const t = useTranslations('admin.navigation')
  const locale = useLocale()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'
  const [query, setQuery] = useState('')

  const navigation = useMemo(() => [
    { name: t('dashboard'), href: `/${locale}/admin`, icon: LayoutDashboard, group: 'Genel' },
    { name: t('analytics'), href: `/${locale}/admin/analytics`, icon: BarChart, group: 'Genel' },
    { name: t('products'), href: `/${locale}/admin/products`, icon: Package, group: 'Katalog' },
    { name: 'Fiyat Çarpanı', href: `/${locale}/admin/price-multiplier`, icon: Settings, group: 'Katalog' },
    { name: 'Trendyol İçe Aktar', href: `/${locale}/admin/trendyol-import`, icon: Package, group: 'Katalog' },
    { name: t('categories'), href: `/${locale}/admin/categories`, icon: FolderOpen, group: 'Katalog' },
    { name: t('orders'), href: `/${locale}/admin/orders`, icon: ShoppingCart, group: 'Satış' },
    { name: t('customers'), href: `/${locale}/admin/customers`, icon: Users, group: 'Müşteri' },
    { name: t('staff', { defaultMessage: (locale === 'tr' ? 'Personeller' : 'Staff') }), href: `/${locale}/admin/staff`, icon: Users, group: 'Müşteri' },
    { name: t('banners'), href: `/${locale}/admin/banners`, icon: LayoutDashboard, group: 'İçerik' },
    { name: (locale === 'tr' ? 'Yüklemeler' : 'Uploads'), href: `/${locale}/admin/uploads`, icon: Upload, group: 'İçerik' },
    { name: t('contact'), href: `/${locale}/admin/contact`, icon: LayoutDashboard, group: 'İletişim' },
    { name: t('about', { defaultMessage: (locale === 'tr' ? 'Hakkımızda' : 'About') }), href: `/${locale}/admin/about`, icon: FileText, group: 'İçerik' },
    { name: t('terms', { defaultMessage: (locale === 'tr' ? 'Kullanım Koşulları' : 'Terms of Use') }), href: `/${locale}/admin/terms`, icon: FileText, group: 'İçerik' },
    { name: t('cookies', { defaultMessage: (locale === 'tr' ? 'Çerez Politikası' : 'Cookie Policy') }), href: `/${locale}/admin/cookies`, icon: FileText, group: 'İçerik' },
    { name: t('privacy', { defaultMessage: (locale === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy') }), href: `/${locale}/admin/privacy`, icon: FileText, group: 'İçerik' },
    { name: t('distance_sales', { defaultMessage: (locale === 'tr' ? 'Mesafeli Satış Sözleşmesi' : 'Distance Sales Agreement') }), href: `/${locale}/admin/distance-sales`, icon: FileText, group: 'İçerik' },
    { name: t('return_policy', { defaultMessage: (locale === 'tr' ? 'İptal ve İade Koşulları' : 'Cancellation & Return Policy') }), href: `/${locale}/admin/return-policy`, icon: FileText, group: 'İçerik' },
    { name: t('shipping_delivery', { defaultMessage: (locale === 'tr' ? 'Kargo ve Teslimat' : 'Shipping & Delivery') }), href: `/${locale}/admin/shipping-delivery`, icon: FileText, group: 'İçerik' },
    { name: t('faqs', { defaultMessage: (locale === 'tr' ? 'Sıkça Sorulan Sorular' : 'FAQs') }), href: `/${locale}/admin/faqs`, icon: FileText, group: 'İçerik' },
    { name: 'Mesajlar', href: `/${locale}/admin/contact/messages`, icon: LayoutDashboard, group: 'İletişim' },
    { name: t('settings'), href: `/${locale}/admin/settings`, icon: Settings, group: 'Ayarlar' },
  ], [t, locale])

  const groups = useMemo(() => {
    const map = new Map<string, typeof navigation>()
    navigation.forEach((item) => {
      const q = query.trim().toLowerCase()
      const matches = !q || item.name.toLowerCase().includes(q)
      if (!matches) return
      const arr = map.get(item.group) || []
      arr.push(item)
      map.set(item.group, arr)
    })
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
  }, [navigation, query])

  return (
    <Sidebar variant="inset" collapsible="offcanvas">
      <SidebarHeader>
        <Link
          href='/'
          className='flex items-center gap-2 text-xl font-bold'
        >
          <Image
            src='/images/logo2.png'
            alt='Hivhestın'
            width={180}
            height={60}
            className='h-10 w-auto'
            priority
          />
        </Link>
        {!collapsed && (
          <SidebarInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Ara...'
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label} className='mb-0 gap-y-0 pb-0'>
            <SidebarCollapsible label={group.label}>
              <SidebarGroupContent className='gap-0'>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild className={isActive ? 'bg-muted text-foreground' : ''}>
                          <Link href={item.href} className='flex items-center gap-2'>
                            <item.icon className='h-4 w-4' />
                            <span className='truncate'>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarCollapsible>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className='flex items-center gap-2'>
          <LanguageSwitcher />
          <CurrencySelector />
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}