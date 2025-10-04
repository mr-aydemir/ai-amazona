import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileForm } from '@/components/dashboard/profile-form'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function ProfilePage() {
  const session = await auth()
  const t = await getTranslations('dashboard.profile')
  const locale = await getLocale()

  if (!session?.user) {
    redirect(`/${locale}/sign-in`)
  }

  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const cookie = (await headers()).get('cookie') || ''
  const res = await fetch(`${baseUrl}/api/user`, {
    cache: 'no-store',
    headers: { cookie },
  })
  if (!res.ok) {
    redirect(`/${locale}/sign-in`)
  }
  const user = await res.json()

  return (
    <div className='space-y-8'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight'>{t('title')}</h2>
        <p className='text-muted-foreground'>{t('description')}</p>
      </div>
      <div className='grid gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>{t('personal_information')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm user={user} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
