import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function QuestionsPage() {
  const session = await auth()
  const locale = await getLocale()
  const t = await getTranslations('dashboard.questions')

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin`)
  }

  const questions = await prisma.productQuestion.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          images: true,
          translations: {
            where: { locale },
            select: { name: true, slug: true }
          }
        }
      }
    }
  })

  return (
    <div className='space-y-8'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight'>{t('title')}</h2>
        <p className='text-muted-foreground'>{t('description')}</p>
      </div>
      {questions.length === 0 ? (
        <p className='text-muted-foreground'>{t('no_questions')}</p>
      ) : (
        <div className='space-y-4'>
          {questions.map((q) => {
            const pt = q.product?.translations?.[0]
            const productName = pt?.name || q.product?.slug || 'Product'
            const productSlug = pt?.slug || q.product?.slug || q.product?.id
            const answered = Boolean(q.answeredAt || q.answer)
            const qaLink = `/${locale}/products/${productSlug}?tab=qa#q-${q.id}`
            return (
              <Card key={q.id}>
                <CardContent className='p-6'>
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex-1 space-y-2'>
                      <div className='flex items-center gap-2'>
                        <Badge variant={answered ? 'default' : 'secondary'}>
                          {answered ? t('status.answered') : t('status.pending')}
                        </Badge>
                        <span className='text-sm text-muted-foreground'>
                          {new Date(q.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <Link href={`/${locale}/dashboard/questions/${q.id}`} className='text-base font-medium hover:underline'>
                        {q.content.length > 100 ? q.content.slice(0, 100) + '…' : q.content}
                      </Link>
                      {q.answer ? (
                        <p className='text-sm text-muted-foreground'>
                          {q.answer.length > 140 ? q.answer.slice(0, 140) + '…' : q.answer}
                        </p>
                      ) : null}
                      <div>
                        <Link href={`/${locale}/products/${productSlug}`} className='text-sm font-medium hover:underline'>
                          {productName}
                        </Link>
                      </div>
                    </div>
                    <div className='flex flex-col gap-2'>
                      <Button asChild variant='outline'>
                        <Link href={`/${locale}/dashboard/questions/${q.id}`}>{t('table.view_detail')}</Link>
                      </Button>
                      <Button asChild variant='ghost'>
                        <Link href={qaLink}>
                          {locale === 'tr' ? 'Ürün Sayfasında Gör' : 'View on Product'}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}