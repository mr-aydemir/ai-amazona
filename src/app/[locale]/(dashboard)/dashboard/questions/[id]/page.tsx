import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getTranslations, getLocale } from 'next-intl/server'

type tParams = Promise<{ id: string }>
interface PageProps { params: tParams }

export default async function QuestionDetailPage({ params }: PageProps) {
  const session = await auth()
  const locale = await getLocale()
  const t = await getTranslations('dashboard.questions')

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin`)
  }

  const { id } = await params
  const q = await prisma.productQuestion.findFirst({
    where: { id, userId: session.user.id },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          images: true,
          translations: { where: { locale }, select: { name: true, slug: true } }
        }
      },
      user: { select: { name: true, email: true } },
    }
  })

  if (!q) {
    redirect(`/${locale}/dashboard/questions`)
  }

  const pt = q.product?.translations?.[0]
  const productName = pt?.name || q.product?.slug || 'Product'
  const productSlug = pt?.slug || q.product?.slug || q.product?.id
  const answered = Boolean(q.answeredAt || q.answer)
  const qaLink = `/${locale}/products/${productSlug}?tab=qa#q-${q.id}`

  return (
    <div className='space-y-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>{t('title')}</h2>
          <p className='text-muted-foreground'>{t('description')}</p>
        </div>
        <Button asChild variant='outline'>
          <Link href={`/${locale}/dashboard/questions`}>{locale === 'tr' ? 'Listeye Dön' : 'Back to List'}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Badge variant={answered ? 'default' : 'secondary'}>
              {answered ? t('status.answered') : t('status.pending')}
            </Badge>
            <Link href={`/${locale}/products/${productSlug}`} className='hover:underline'>
              {productName}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div>
            <h3 className='text-lg font-semibold'>{locale === 'tr' ? 'Sorunuz' : 'Your Question'}</h3>
            <p className='mt-2 whitespace-pre-wrap'>{q.content}</p>
            <p className='mt-2 text-sm text-muted-foreground'>
              {new Date(q.createdAt).toLocaleString()}
            </p>
          </div>

          <div>
            <h3 className='text-lg font-semibold'>{locale === 'tr' ? 'Yanıt' : 'Answer'}</h3>
            {q.answer ? (
              <p className='mt-2 whitespace-pre-wrap'>{q.answer}</p>
            ) : (
              <p className='mt-2 text-muted-foreground'>
                {locale === 'tr' ? 'Henüz yanıtlanmadı.' : 'Not answered yet.'}
              </p>
            )}
            {q.answeredAt ? (
              <p className='mt-2 text-sm text-muted-foreground'>
                {new Date(q.answeredAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          <div className='flex gap-3'>
            <Button asChild>
              <Link href={qaLink}>
                {locale === 'tr' ? 'Ürün Sayfasında Gör' : 'View on Product'}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}