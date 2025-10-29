import prisma from '@/lib/prisma'
import { getTranslations, getLocale } from 'next-intl/server'
import { formatCurrency } from '@/lib/utils'
import { getCurrencyData } from '@/lib/server-currency'
import { pickTranslatedName } from '@/lib/eav'

export default async function AdminCartsPage() {
  const t = await getTranslations('admin.carts')
  const locale = await getLocale()
  const { baseCurrency } = await getCurrencyData()

  const carts = await prisma.cart.findMany({
    take: 200,
    orderBy: { updatedAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      items: {
        include: {
          product: {
            include: {
              translations: { where: { locale } }
            }
          }
        }
      },
    },
  })

  const rows = carts.flatMap((cart) =>
    cart.items.map((item) => ({
      userName: cart.user?.name || cart.user?.email || t('anonymous'),
      productName:
        pickTranslatedName((item.product as any)?.translations || [], locale) ||
        item.product?.name ||
        t('unknown_product'),
      quantity: item.quantity,
      price: item.product?.price ?? 0,
      subtotal: (item.product?.price ?? 0) * item.quantity,
      updatedAt: cart.updatedAt,
    }))
  )

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight'>{t('title')}</h2>
        <p className='text-muted-foreground'>{t('description')}</p>
      </div>

      <div className='overflow-x-auto border rounded-md'>
        <table className='min-w-full text-sm'>
          <thead className='bg-muted'>
            <tr>
              <th className='p-3 text-left'>{t('table.user')}</th>
              <th className='p-3 text-left'>{t('table.product')}</th>
              <th className='p-3 text-right'>{t('table.quantity')}</th>
              <th className='p-3 text-right'>{t('table.price')}</th>
              <th className='p-3 text-right'>{t('table.subtotal')}</th>
              <th className='p-3 text-left'>{t('table.updated_at')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className='p-4 text-center text-muted-foreground' colSpan={6}>{t('empty')}</td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={idx} className='border-t'>
                  <td className='p-3'>{r.userName}</td>
                  <td className='p-3'>{r.productName}</td>
                  <td className='p-3 text-right'>{r.quantity}</td>
                  <td className='p-3 text-right'>{formatCurrency(r.price, baseCurrency)}</td>
                  <td className='p-3 text-right'>{formatCurrency(r.subtotal, baseCurrency)}</td>
                  <td className='p-3'>{new Date(r.updatedAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}