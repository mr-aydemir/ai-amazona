import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { getStaticPage } from '@/lib/static-page'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 300

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
  const data = await getStaticPage('return-policy', locale)

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="prose max-w-none p-6" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
      </Card>
    </div>
  )
}