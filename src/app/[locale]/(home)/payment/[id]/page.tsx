
import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/auth'
import { OrderSummaryContainer } from '@/components/checkout/order-summary-container'
import { getOrderById } from '@/lib/actions/order.actions'
import prisma from '@/lib/prisma'
import { PaymentPageContent } from '@/components/checkout/payment-page-content'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
    notFound()
  }

  // Get order by ID
  const order = await getOrderById(id)

  if (!order || order.userId !== session.user.id) {
    notFound()
  }

  // Ödeme tamamlanmış siparişler için ödeme sayfasına geri giriş engellenir
  if (order.status === 'PAID' || order.paidAt) {
    redirect(`/${locale}/payment/success?orderId=${order.id}`)
  }

  const t = await getTranslations('payment')

  return (
    <div className="container mx-auto px-4 py-8">
      <CheckoutSteps currentStep={3} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardContent>
            <CardHeader>
              <h1 className="text-2xl font-bold mb-6">{t('page.paymentInformation')}</h1>
            </CardHeader>
            {/* Kayıtlı kartları sunucu tarafında getir */}
            {(() => {
              return null
            })()}
            <PaymentPageContent
              order={order}
              session={session}
              savedCards={await prisma.savedCard.findMany({
                where: { userId: session.user.id },
                orderBy: { createdAt: 'desc' }
              })}
            />
          </CardContent>
        </Card>
        <div>
          <Card>
            <CardContent>
              <CardHeader>
                <h2 className="text-xl font-semibold mb-4">{t('page.orderSummary')}</h2>
              </CardHeader>
              <OrderSummaryContainer
                orderItems={order.items as any}
                orderTotal={order.total as any}
              /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
