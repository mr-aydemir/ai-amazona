'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/store/use-cart'
import { useTranslations, useLocale } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useCurrency } from '@/components/providers/currency-provider'
import { formatCurrency } from '@/lib/utils'

export function CartBadge() {
  const cart = useCart()
  const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0)
  const t = useTranslations('cart')
  const tc = useTranslations('common.currency')
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)

  const { displayCurrency, convert } = useCurrency()
  const [vatRate, setVatRate] = useState<number>(0.1)
  const [showInclVat, setShowInclVat] = useState<boolean>(false)
  const [translatedNames, setTranslatedNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (cart.items.length === 0) return
    const uniqueIds = Array.from(new Set(cart.items.map(i => i.productId)))
    let cancelled = false
    Promise.all(uniqueIds.map(async (id) => {
      try {
        const res = await fetch(`/api/products/${locale}/${id}`)
        if (!res.ok) return null
        const data = await res.json()
        return { id, name: (data?.name as string) || null }
      } catch {
        return null
      }
    })).then(results => {
      if (cancelled) return
      const map: Record<string, string> = {}
      for (const r of results) {
        if (r && r.name) {
          map[r.id] = r.name
        }
      }
      setTranslatedNames(map)
    })
    return () => { cancelled = true }
  }, [cart.items, locale])

  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const res = await fetch('/api/admin/currency', { cache: 'no-store' })
          const json = await res.json()
          const vr = typeof json?.vatRate === 'number' ? json.vatRate : 0.1
          const incl = !!json?.showPricesInclVat
          if (!cancelled) {
            setVatRate(vr)
            setShowInclVat(incl)
          }
        } catch {
          // ignore
        }
      })()
    return () => { cancelled = true }
  }, [])

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant='ghost' size='icon' className='relative' title={useTranslations('common')('navigation.cart')}>
          <ShoppingCart className='h-5 w-5' />
          {itemCount > 0 && (
            <span className='absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center'>
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className='flex w-full flex-col sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>{t('cart.title')} ({itemCount})</SheetTitle>
        </SheetHeader>
        {cart.items.length > 0 ? (
          <>
            <ScrollArea className='flex-1 pr-4 -mr-4'>
              <div className='flex flex-col gap-4 py-4'>
                {cart.items.map((item) => (
                  <div key={item.id} className='flex gap-4'>
                    <div className='relative aspect-square h-16 w-16 min-w-[4rem] overflow-hidden rounded-md border'>
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className='object-cover'
                      />
                    </div>
                    <div className='flex flex-1 flex-col justify-between'>
                      <div className='flex justify-between gap-2'>
                        <div className='line-clamp-2 text-sm font-medium'>
                          <Link 
                            href={`/products/${item.productId}`}
                            onClick={() => setIsOpen(false)}
                          >
                            {translatedNames[item.productId] ?? item.name}
                          </Link>
                        </div>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6 shrink-0 text-muted-foreground hover:bg-transparent hover:text-destructive'
                          onClick={() => cart.removeItem(item.productId)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <Button
                            variant='outline'
                            size='icon'
                            className='h-6 w-6'
                            onClick={() => cart.updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className='h-3 w-3' />
                          </Button>
                          <span className='text-sm w-4 text-center'>{item.quantity}</span>
                          <Button
                            variant='outline'
                            size='icon'
                            className='h-6 w-6'
                            onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className='h-3 w-3' />
                          </Button>
                        </div>
                        <div className='text-sm font-medium'>
                          {formatCurrency(convert((showInclVat ? item.price * (1 + vatRate) : item.price) * item.quantity), displayCurrency, locale)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className='space-y-4 pt-4'>
              <Separator />
              <div className='space-y-1.5'>
                <div className='flex justify-between font-bold'>
                  <span>{t('cart.total')}</span>
                  <span>
                     {formatCurrency(convert(showInclVat ? cart.getTotal() * (1 + vatRate) : cart.getTotal()), displayCurrency, locale)}
                  </span>
                </div>
                {!showInclVat && (
                  <div className='flex justify-end text-xs text-muted-foreground'>
                    {tc('excl_vat_suffix')}
                  </div>
                )}
              </div>
              <SheetFooter className='flex-col gap-2 sm:flex-col sm:space-x-0'>
                 <Button className='w-full' asChild onClick={() => setIsOpen(false)}>
                  <Link href='/checkout'>{t('cart.proceed_to_checkout')}</Link>
                </Button>
                <Button variant='outline' className='w-full' asChild onClick={() => setIsOpen(false)}>
                  <Link href='/cart'>{t('cart.title')}</Link>
                </Button>
              </SheetFooter>
            </div>
          </>
        ) : (
          <div className='flex flex-1 flex-col items-center justify-center space-y-4'>
            <ShoppingCart className='h-16 w-16 text-muted-foreground/20' />
             <p className='text-lg font-medium text-muted-foreground'>
               {t('cart.empty')}
             </p>
             <SheetFooter className='w-full sm:justify-center'>
               <Button variant='outline' asChild onClick={() => setIsOpen(false)}>
                 <Link href='/products'>{t('cart.continue_shopping')}</Link>
               </Button>
             </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
