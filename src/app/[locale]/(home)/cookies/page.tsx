import type { Metadata } from 'next'
import { buildStaticPageMetadata, getStaticPage } from '@/lib/static-page'

type Props = { params: Promise<{ locale: string }> }

export const revalidate = 300

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const data = await getStaticPage('cookies', locale)
  return buildStaticPageMetadata({
    slug: 'cookies',
    locale,
    title: data.title,
    contentHtml: data.contentHtml,
    fallbackTitle: { tr: 'Çerez Politikası', en: 'Cookie Policy' },
    fallbackDescription: {
      tr: 'Hivhestın çerez politikası ve çerez kullanımı hakkında bilgi.',
      en: 'Hivhestın cookie policy and information about how cookies are used.',
    },
  })
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params
  const data = await getStaticPage('cookies', locale)
  const title = data.title || (locale.startsWith('en') ? 'Cookie Policy' : 'Çerez Politikası')

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
    </div>
  )
}