import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { buildStaticPageMetadata, getStaticPage } from '@/lib/static-page'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const data = await getStaticPage('terms', locale)
  return buildStaticPageMetadata({
    slug: 'terms',
    locale,
    title: data.title,
    contentHtml: data.contentHtml,
    fallbackTitle: { tr: 'Kullanım Koşulları', en: 'Terms of Use' },
    fallbackDescription: {
      tr: 'Hivhestın kullanım koşulları ve site kullanımına ilişkin şartlar.',
      en: 'Hivhestın terms of use and the conditions for using the site.',
    },
  })
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params
  const data = await getStaticPage('terms', locale)

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="prose max-w-none p-6" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
      </Card>
    </div>
  )
}