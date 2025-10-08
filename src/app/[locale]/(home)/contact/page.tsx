import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Phone, MapPin, Hash, CreditCard, Landmark, Building2 } from 'lucide-react'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import ContactForm from '@/components/home/contact-form'

type ContactData = {
  id: string
  companyName: string | null
  phone: string | null
  email: string | null
  iban: string | null
  taxNumber: string | null
  mernisNumber: string | null
  mapEmbed: string | null
  address: string | null
}

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations('contact')
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
  const res = await fetch(`${baseUrl}/api/contact/${locale}`, { cache: 'no-store' })
  const data = await res.json()
  const contact: ContactData | null = data?.contact || null

  return (
    <div className='container mx-auto px-4 py-6'>
      <h1 className='text-2xl font-bold mb-4'>{t('title')}</h1>
      {contact?.companyName && (
        <div className='flex items-center gap-2 text-lg font-semibold mb-4'>
          <Building2 className='h-5 w-5 text-muted-foreground' />
          <span>{contact.companyName}</span>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('info.title')}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center gap-3'>
                <Phone className='h-5 w-5 text-muted-foreground' />
                <div className='grid grid-cols-[160px_1fr] items-center w-full gap-3'>
                  <span className='font-medium'>{t('info.phone')}</span>
                  <span>{contact?.phone || '-'}</span>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <Mail className='h-5 w-5 text-muted-foreground' />
                <div className='grid grid-cols-[160px_1fr] items-center w-full gap-3'>
                  <span className='font-medium'>{t('info.email')}</span>
                  <span>{contact?.email || '-'}</span>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <CreditCard className='h-5 w-5 text-muted-foreground' />
                <div className='grid grid-cols-[160px_1fr] items-center w-full gap-3'>
                  <span className='font-medium'>{t('info.iban')}</span>
                  <span>{contact?.iban || '-'}</span>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <Landmark className='h-5 w-5 text-muted-foreground' />
                <div className='grid grid-cols-[160px_1fr] items-center w-full gap-3'>
                  <span className='font-medium'>{t('info.taxNumber')}</span>
                  <span>{contact?.taxNumber || '-'}</span>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <Hash className='h-5 w-5 text-muted-foreground' />
                <div className='grid grid-cols-[160px_1fr] items-center w-full gap-3'>
                  <span className='font-medium'>{t('info.mernisNumber')}</span>
                  <span>{contact?.mernisNumber || '-'}</span>
                </div>
              </div>
              <div className='flex items-start gap-3'>
                <MapPin className='h-5 w-5 text-muted-foreground mt-1' />
                <div className='grid grid-cols-[160px_1fr] items-start w-full gap-3'>
                  <span className='font-medium'>{t('info.address')}</span>
                  <span className='whitespace-pre-line'>{contact?.address || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className='mt-6'>
            <CardHeader>
              <CardTitle>{t('form.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactForm locale={locale} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {contact?.mapEmbed ? (
              <div className='h-screen w-full'>
                <iframe
                  src={contact.mapEmbed}
                  className='w-full h-full rounded-md border'
                  loading='lazy'
                  referrerPolicy='no-referrer-when-downgrade'
                />
              </div>
            ) : (
              <div className='text-muted-foreground'>{t('map.notFound')}</div>
            )}
          </CardContent>
        </Card>
      </div>


    </div>
  )
}
