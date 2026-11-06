import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { buildStaticPageMetadata, getStaticPage } from '@/lib/static-page'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const data = await getStaticPage('privacy', locale)
  return buildStaticPageMetadata({
    slug: 'privacy',
    locale,
    title: data.title,
    contentHtml: data.contentHtml,
    fallbackTitle: { tr: 'Gizlilik Politikası', en: 'Privacy Policy' },
    fallbackDescription: {
      tr: 'Hivhestın gizlilik politikası ve kişisel verilerin korunması hakkında bilgi.',
      en: 'Hivhestın privacy policy and information about the protection of personal data.',
    },
  })
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params
  const data = await getStaticPage('privacy', locale)

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="prose max-w-none p-6" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
      </Card>
    </div>
  )
}