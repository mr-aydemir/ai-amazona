import prisma from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { formatCurrency } from '@/lib/utils'
import { getCurrencyData } from '@/lib/server-currency'

export default async function AdminFavoritesPage() {
  const t = await getTranslations('admin.favorites')
  const { baseCurrency } = await getCurrencyData()

  const favorites = await prisma.favorite.findMany({
    take: 300,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      product: true,
    },
  })

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
              <th className='p-3 text-right'>{t('table.price')}</th>
              <th className='p-3 text-left'>{t('table.added_at')}</th>
            </tr>
          </thead>
          <tbody>
            {favorites.length === 0 ? (
              <tr>
                <td className='p-4 text-center text-muted-foreground' colSpan={4}>{t('empty')}</td>
              </tr>
            ) : (
              favorites.map((f) => (
                <tr key={f.id} className='border-t'>
                  <td className='p-3'>{f.user?.name || f.user?.email || t('anonymous')}</td>
                  <td className='p-3'>{f.product?.name ?? t('unknown_product')}</td>
                  <td className='p-3 text-right'>{formatCurrency(f.product?.price ?? 0, baseCurrency)}</td>
                  <td className='p-3'>{new Date(f.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}