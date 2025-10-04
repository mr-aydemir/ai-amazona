import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddressForm } from '@/components/dashboard/address-form'
import { AddressList } from '@/components/dashboard/address-list'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function AddressesPage() {
  const session = await auth()
  const t = await getTranslations('dashboard.addresses')
  const locale = await getLocale()

  if (!session?.user) {
    redirect(`/${locale}/sign-in`)
  }

  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const cookie = (await headers()).get('cookie') || ''
  const res = await fetch(`${baseUrl}/api/addresses`, {
    cache: 'no-store',
    headers: { cookie },
  })
  if (!res.ok) {
    redirect(`/${locale}/sign-in`)
  }
  const addresses = await res.json()

  return (
    <div className='space-y-8'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight'>{t('title')}</h2>
        <p className='text-muted-foreground'>{t('description')}</p>
      </div>
      <div className='grid gap-8'>
        <Card>
          <CardHeader>
            <CardTitle>{t('add_new')}</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('your_addresses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressList addresses={addresses} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
