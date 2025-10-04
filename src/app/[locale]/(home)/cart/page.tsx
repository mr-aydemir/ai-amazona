'use client'

import { useCart } from '@/store/use-cart'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useCurrency } from '@/components/providers/currency-provider'

export default function CartPage() {
  const cart = useCart()
  const t = useTranslations('cart')
  const locale = useLocale()

  const { displayCurrency, convert } = useCurrency()

  if (cart.items.length === 0) {
    return (
      <div className='container mx-auto px-4 py-16'>
        <Card>
          <CardHeader>
            <CardTitle>{t('cart.empty')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground'>
              {t('cart.empty_message')}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href='/products'>{t('cart.continue_shopping')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className='container mx-auto px-4 py-16'>
      <Card>
        <CardHeader>
          <CardTitle>{t('cart.title')}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {cart.items.map((item) => (
            <div
              key={item.id}
              className='flex items-center gap-4 py-4 border-b last:border-0'
            >
              <div className='relative aspect-square h-24 w-24 flex-shrink-0 overflow-hidden rounded-md'>
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className='object-cover'
                />
              </div>
              <div className='flex flex-1 flex-col'>
                <Link
                  href={`/products/${item.productId}`}
                  className='font-medium hover:underline'
                >
                  {item.name}
                </Link>
                <span className='text-muted-foreground'>
                  {new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency }).format(convert(item.price))}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <Input
                  type='number'
                  min='1'
                  value={item.quantity}
                  onChange={(e) =>
                    cart.updateQuantity(
                      item.productId,
                      parseInt(e.target.value)
                    )
                  }
                  className='w-20'
                />
                <Button
                  variant='destructive'
                  size='icon'
                  onClick={() => cart.removeItem(item.productId)}
                  title={t('cart.remove')}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
              <div className='text-right min-w-[100px]'>
                <div className='font-medium'>
                  {new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency }).format(convert(item.price * item.quantity))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className='flex justify-between'>
          <div className='text-lg font-bold'>
            {t('cart.total')}: {new Intl.NumberFormat(locale, { style: 'currency', currency: displayCurrency }).format(convert(cart.getTotal()))}
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' asChild>
              <Link href='/products'>{t('cart.continue_shopping')}</Link>
            </Button>
            <Button asChild>
              <Link href='/checkout'>{t('cart.proceed_to_checkout')}</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
