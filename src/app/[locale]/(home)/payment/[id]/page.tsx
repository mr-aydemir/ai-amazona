
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { OrderSummaryContainer } from '@/components/checkout/order-summary-container'
import { PaymentPageContent } from '@/components/checkout/payment-page-content'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CheckoutSteps from '@/components/checkout/checkout-steps'

export const metadata: Metadata = {
  title: 'Payment',
}

interface PaymentPageProps {
  params: Promise<{ id: string; locale: string }>
}

export default async function PaymentPage(props: PaymentPageProps) {
  const { id, locale } = await props.params
  const session = await auth()

  if (!session?.user) {
    // Login required; redirect to localized sign-in with callback
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/payment/${id}`)
  }

  // Get order by ID via API
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const cookie = (await headers()).get('cookie') || ''
  const ordersRes = await fetch(`${baseUrl}/api/orders`, { cache: 'no-store', headers: { cookie } })
  if (!ordersRes.ok) {
    notFound()
  }
  const ordersData = await ordersRes.json().catch(() => null)
  const order = Array.isArray(ordersData?.orders)
    ? ordersData.orders.find((o: any) => o.id === id)
    : null

  if (!order || order.userId !== session.user.id) {
    notFound()
  }

  // Ödeme tamamlanmış siparişler için ödeme sayfasına geri giriş engellenir
  if (order.status === 'PAID' || order.paidAt) {
    redirect(`/${locale}/payment/success?orderId=${order.id}`)
  }

  const t = await getTranslations('payment')

  // Fetch Terms and Privacy content server-side for SSR modals
  const termsHtml = await (async () => {
    try {
      let page = await prisma.page.findUnique({ where: { slug: 'terms' } })
      if (!page) {
        page = await prisma.page.create({ data: { slug: 'terms' } })
      }
      const translation = await prisma.pageTranslation.findUnique({
        where: { pageId_locale: { pageId: page.id, locale } },
      })
      return translation?.contentHtml || null
    } catch {
      return null
    }
  })()

  const privacyHtml = await (async () => {
    try {
      let page = await prisma.page.findUnique({ where: { slug: 'privacy' } })
      if (!page) {
        page = await prisma.page.create({ data: { slug: 'privacy' } })
      }
      const translation = await prisma.pageTranslation.findUnique({
        where: { pageId_locale: { pageId: page.id, locale } },
      })
      return translation?.contentHtml || null
    } catch {
      return null
    }
  })()

  return (
    <div className="container mx-auto px-4 py-8">
      <CheckoutSteps currentStep={3} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="space-y-4">
          <CardHeader className="bg-muted">
            <CardTitle className="text-foreground">{t('page.paymentInformation')}</CardTitle>
          </CardHeader>
          <CardContent>

            {/* Kayıtlı kartları sunucu tarafında getir */}
            {(() => {
              return null
            })()}
            <PaymentPageContent
              order={order}
              session={session}
              savedCards={(await (async () => {
                const res = await fetch(`${baseUrl}/api/saved-cards`, { cache: 'no-store', headers: { cookie } })
                if (!res.ok) return []
                const data = await res.json().catch(() => null)
                return Array.isArray(data?.cards) ? data.cards : []
              })())}
              termsHtml={termsHtml}
              privacyHtml={privacyHtml}
            />
          </CardContent>
        </Card>
        <div>
          <Card className="space-y-4">
            <CardHeader className="bg-muted">
              <CardTitle className="text-foreground">{t('page.orderSummary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderSummaryContainer
                orderItems={order.items as any}
                orderTotal={order.total as any}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
