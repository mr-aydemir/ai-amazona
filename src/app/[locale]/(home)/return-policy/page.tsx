import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

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