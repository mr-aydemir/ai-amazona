import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Package, Truck, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'

interface PageProps {
  searchParams: Promise<{ orderId?: string }>
}

async function PaymentSuccessContent({ searchParams }: PageProps) {
  const session = await auth()
  const { orderId } = await searchParams
  const t = await getTranslations('payment.success')
  const tOrder = await getTranslations('order')
  const locale = await getLocale()

  if (!session?.user?.id) {
    redirect('/api/auth/signin')
  }

  if (!orderId) {
    redirect('/')
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
      userId: session.user.id,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  })

  if (!order) {
    redirect('/')
  }

  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = subtotal * 0.18
  const shipping = order.shippingCost || 0
  const total = subtotal + tax + shipping

  return (
    <div className="container max-w-4xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-green-600 mb-2">
          {t('title')}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {tOrder('orderDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">{tOrder('orderNumber')}:</span>
              <span className="font-mono text-sm">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{tOrder('orderDate')}:</span>
              <span>{new Date(order.createdAt).toLocaleDateString(locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{tOrder('paymentDate')}:</span>
              <span>{order.paidAt ? new Date(order.paidAt).toLocaleDateString(locale) : tOrder('unknown')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{tOrder('status')}:</span>
              <span className="text-green-600 font-semibold">{tOrder('paid')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {tOrder('deliveryInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{order.shippingFullName}</p>
            <p className="text-sm text-muted-foreground">
              {order.shippingStreet}
            </p>
            <p className="text-sm text-muted-foreground">
              {order.shippingCity}, {order.shippingPostalCode}
            </p>
            <p className="text-sm text-muted-foreground">
              {order.shippingCountry}
            </p>
            <p className="text-sm text-muted-foreground">
              Tel: {order.shippingPhone}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {tOrder('orderSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b">
                <div className="flex-1">
                  <h4 className="font-medium">{item.product.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {tOrder('quantity')}: {item.quantity} × ₺{item.price.toFixed(2)}
                  </p>
                </div>
                <div className="font-medium">
                  ₺{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}

            <div className="space-y-2 pt-4">
              <div className="flex justify-between">
                <span>{tOrder('subtotal')}:</span>
                <span>₺{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{tOrder('tax')} (%18):</span>
                <span>₺{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{tOrder('shipping')}:</span>
                <span>₺{shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>{tOrder('total')}:</span>
                <span>₺{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
        <Button asChild>
          <Link href="/dashboard/orders">
            {t('view_orders')}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            {t('continue_shopping')}
          </Link>
        </Button>
      </div>

      <div className="mt-8 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
          {t('next_steps')}
        </h3>
        <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
          <li>• {tOrder('next_steps.item1')}</li>
          <li>• {tOrder('next_steps.item2')}</li>
          <li>• {tOrder('next_steps.item3')}</li>
          <li>• {tOrder('next_steps.item4')}</li>
        </ul>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage(props: PageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentSuccessContent {...props} />
    </Suspense>
  )
}