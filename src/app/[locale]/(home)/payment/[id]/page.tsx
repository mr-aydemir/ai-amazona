
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentPageContent } from '@/components/checkout/payment-page-content'
import { OrderSummaryContainer } from '@/components/checkout/order-summary-container'
import { OrderStatus } from '@prisma/client'
import { auth } from '@/auth'
import CheckoutSteps from '@/components/checkout/checkout-steps'

type tParams = Promise<{ id: string }>

interface PageProps {
  params: tParams
}

export default async function PaymentPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  const order = await prisma.order.findUnique({
    where: {
      id: id,
      userId: session.user.id,
      status: OrderStatus.PENDING
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      }
    }
  })

  if (!order) {
    redirect('/dashboard/orders')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <CheckoutSteps currentStep={3} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Ödeme Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentPageContent order={order} session={session} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Sipariş Özeti</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderSummaryContainer
                orderItems={order.items}
                orderTotal={order.total}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
