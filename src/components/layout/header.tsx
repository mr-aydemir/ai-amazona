'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, User, LogOut, X, Menu } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession, signIn, signOut } from 'next-auth/react'
import { CartBadge } from '@/components/layout/cart-badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { CurrencySelector } from '@/components/ui/currency-selector'
import { useTranslations, useLocale } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const t = useTranslations('common')
  const locale = useLocale()
  // Mobile sheet state and categories
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [catLoading, setCatLoading] = useState(false)

  // Sync search input with URL search parameter
  useEffect(() => {
    const search = searchParams.get('search')
    if (search) {
      setSearchQuery(search)
    }
  }, [searchParams])

  // Fetch categories for mobile menu
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCatLoading(true)
        const res = await fetch(`/api/categories/${locale}`)
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data) ? data : []
          setCategories(list.map((c: any) => ({ id: c.id, name: c.name })))
        }
      } catch (e) {
        console.error('Header categories fetch error:', e)
      } finally {
        setCatLoading(false)
      }
    }
    fetchCategories()
  }, [locale])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/${locale}/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    router.push(`/${locale}/products`)
  }

  return (
    <header className='border-b'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center justify-between'>
          {/* Logo */}
          <div className='flex items-center gap-2 flex-shrink-0'>
            {/* Mobile Menu Trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant='ghost' size='icon' className='md:hidden'>
                  <Menu className='h-5 w-5' />
                </Button>
              </SheetTrigger>
              <SheetContent side='left' className='p-4 flex flex-col'>
                <SheetHeader>
                  <SheetTitle className='text-left'>Menu</SheetTitle>
                </SheetHeader>
                {/* Scrollable body */}
                <div className='mt-4 flex-1 overflow-y-auto pr-2'>
                  <Link href={`/${locale}/products`} className='text-sm font-medium text-foreground'>
                    {t('navigation.products')}
                  </Link>

                  {/* Categories Section */}
                  <div className='mt-3'>
                    <div className='text-xs font-semibold text-muted-foreground'>
                      {t('navigation.categories')}
                    </div>
                    <div className='mt-2 flex flex-col'>
                      {catLoading ? (
                        <div className='text-sm text-muted-foreground'>{locale === 'tr' ? 'Yükleniyor...' : 'Loading...'}</div>
                      ) : categories.length ? (
                        categories.map((cat) => (
                          <button
                            key={cat.id}
                            className='text-sm text-muted-foreground hover:text-foreground text-left py-1'
                            onClick={() => {
                              setMobileOpen(false)
                              router.push(`/${locale}/products?category=${encodeURIComponent(cat.id)}`)
                            }}
                          >
                            {cat.name}
                          </button>
                        ))
                      ) : (
                        <div className='text-sm text-muted-foreground'>{locale === 'tr' ? 'Kategori yok' : 'No categories'}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer controls (non-scroll area) */}
                <div className='pt-3 border-t flex items-center gap-3'>
                  <LanguageSwitcher />
                  <CurrencySelector />
                  <ThemeToggle />
                </div>
              </SheetContent>
            </Sheet>
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
          </div>

          {/* Products Catalog Link */}
          <Link
            href={`/${locale}/products`}
            className='ml-6 hidden md:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
          >
            {t('navigation.products')}
          </Link>

          {/* Search */}
          <div className='hidden sm:block flex-1 max-w-2xl mx-8'>
            <form onSubmit={handleSearch} className='relative'>
              <Input
                type='search'
                placeholder={t('search.placeholder')}
                className='w-full pl-10 pr-10'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              {searchQuery && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent'
                  onClick={clearSearch}
                >
                  <X className='h-4 w-4 text-muted-foreground' />
                </Button>
              )}
            </form>
          </div>

          {/* Navigation */}
          <nav className='flex items-center gap-2 sm:gap-4'>
            <Button variant='ghost' size='icon' asChild className="sm:hidden">
              <Link href={`/${locale}/products`}>
                <Search className='h-5 w-5 ' />
              </Link>
            </Button>
            <div className='hidden md:flex items-center gap-2 sm:gap-4'>
              <LanguageSwitcher />
              <CurrencySelector />
              <ThemeToggle />
            </div>
            <CartBadge />
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' className='flex items-center gap-2'>
                    <User className='h-5 w-5' />
                    <span className='hidden sm:inline-block'>
                      {session.user.name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-60'>
                  <DropdownMenuLabel className='font-normal'>
                    <div className='flex flex-col space-y-1'>
                      <p className='text-sm font-medium leading-none'>
                        {session.user.name}
                      </p>
                      <p className='text-xs leading-none text-muted-foreground'>
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/dashboard/orders`}>{t('navigation.orders')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/dashboard/profile`}>{t('navigation.profile')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/dashboard/addresses`}>{t('navigation.addresses')}</Link>
                  </DropdownMenuItem>
                  {session.user.role === 'ADMIN' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/${locale}/admin`}>{t('navigation.admin')}</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className='text-red-600'
                  >
                    <LogOut className='mr-2 h-4 w-4' />
                    {t('actions.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant='default' onClick={() => signIn()}>
                {t('actions.signIn')}
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
