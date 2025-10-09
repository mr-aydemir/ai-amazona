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
  const path = 'return-policy'
  const url = `${baseUrl.replace(/\/$/, '')}/${locale}/${path}`
  const title = isEn ? 'Return & Refund Policy' : 'İade ve İptal Koşulları'
  const description = isEn
    ? 'Learn about our return and refund policy, terms, and conditions.'
    : 'İade ve iptal politikamızın koşullarını ve şartlarını öğrenin.'

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

export default async function ReturnPolicyPage({ params }: Props) {
  const { locale } = await params
  const cookies = (await headers()).get('cookie') || ''
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
  const origin = baseUrl || ''
  const url = `${origin}/api/return-policy/${locale}`

  const res = await fetch(url, { headers: { cookie: cookies }, cache: 'no-store' })
  if (!res.ok) return notFound()
  const data = (await res.json()) as { returnPolicy?: { contentHtml: string | null } }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="prose max-w-none p-6" dangerouslySetInnerHTML={{ __html: data.returnPolicy?.contentHtml || '' }} />
      </Card>
    </div>
  )
}