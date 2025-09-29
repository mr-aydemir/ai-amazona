import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { IyzicoCustomPayment } from '@/components/checkout/iyzico-custom-payment'
import { OrderSummary } from '@/components/checkout/order-summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderStatus } from '@prisma/client'

type tParams = Promise<{ id: string }>

interface PageProps {
  params: tParams
}

export default async function PaymentPage({ params }: PageProps) {
  const session = await auth()
  const { id } = await params

  console.log('[PAYMENT_PAGE] Starting payment page for orderId:', id)
  console.log('[PAYMENT_PAGE] Session user:', session?.user?.id)

  if (!session?.user) {
    console.log('[PAYMENT_PAGE] No session, redirecting to signin')
    redirect('/api/auth/signin?callbackUrl=/payment/' + id)
  }

  console.log('[PAYMENT_PAGE] Fetching order from database...')
  const order = await prisma.order.findUnique({
    where: {
      id: id,
      userId: session.user.id,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      shippingAddress: true,
    },
  })

  console.log('[PAYMENT_PAGE] Order found:', !!order)
  console.log('[PAYMENT_PAGE] Order status:', order?.status)
  console.log('[PAYMENT_PAGE] Order iyzicoPaymentId:', order?.iyzicoPaymentId)

  if (!order) {
    console.log('[PAYMENT_PAGE] Order not found, redirecting to homepage')
    redirect('/')
  }

  // If order is already paid, redirect to confirmation
  if (order.status === OrderStatus.PAID || order.iyzicoPaymentId) {
    console.log('[PAYMENT_PAGE] Order already paid, redirecting to confirmation')
    redirect(`/order-confirmation/${order.id}`)
  }

  console.log('[PAYMENT_PAGE] Rendering payment page')

  return (
    <div className='container max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8'>
      <h1 className='text-3xl font-bold mb-10'>Ödeme</h1>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Ödeme Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <IyzicoCustomPayment
                orderId={id}
                orderItems={order.items}
                shippingAddress={order.shippingAddress}
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Sipariş Özeti</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderSummary
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
