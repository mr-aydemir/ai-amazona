import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

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
  const cookies = (await headers()).get('cookie') || ''
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
  const origin = baseUrl || ''
  const url = `${origin}/api/distance-sales/${locale}`

  const res = await fetch(url, { headers: { cookie: cookies }, cache: 'no-store' })
  if (!res.ok) return notFound()
  const data = (await res.json()) as { distanceSales?: { contentHtml: string | null } }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="prose max-w-none p-6" dangerouslySetInnerHTML={{ __html: data.distanceSales?.contentHtml || '' }} />
      </Card>
    </div>
  )
}