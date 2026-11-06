import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { buildStaticPageMetadata, getStaticPage } from '@/lib/static-page'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const data = await getStaticPage('about', locale)
  return buildStaticPageMetadata({
    slug: 'about',
    locale,
    title: data.title,
    contentHtml: data.contentHtml,
    fallbackTitle: { tr: 'Hakkımızda', en: 'About Us' },
    fallbackDescription: {
      tr: 'Hivhestın hakkında bilgi alın; hikayemiz ve 3D baskı yaklaşımımız.',
      en: 'Learn more about Hivhestın, our story and our approach to 3D printing.',
    },
  })
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  const data = await getStaticPage('about', locale)

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="prose max-w-none p-6" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
      </Card>
    </div>
  )
}