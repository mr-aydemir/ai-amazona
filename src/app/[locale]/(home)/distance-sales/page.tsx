import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { getStaticPage } from '@/lib/static-page'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const isEn = locale?.startsWith('en')
  const path = 'distance-sales'
  const url = `${baseUrl.replace(/\/$/, '')}/${locale}/${path}`
  const title = isEn ? 'Distance Sales Agreement' : 'Mesafeli Satış Sözleşmesi'
  const description = isEn
    ? 'Read the distance sales agreement and related legal information.'
    : 'Mesafeli satış sözleşmesi ve ilgili yasal bilgileri okuyun.'

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: `${baseUrl.replace(/\/$/, '')}/tr/${path}`,
        en: `${baseUrl.replace(/\/$/, '')}/en/${path}`,
      },
    },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
    },
    robots: { index: true, follow: true },
  }
}

export default async function DistanceSalesPage({ params }: Props) {
  const { locale } = await params
  const data = await getStaticPage('distance-sales', locale)

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="prose max-w-none p-6" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
      </Card>
    </div>
  )
}