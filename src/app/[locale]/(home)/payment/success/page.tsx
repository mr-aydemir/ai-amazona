import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Package, Truck, CreditCard, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { getCurrencyData } from '@/lib/server-currency'

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

  // Para birimi ve dönüşüm oranı belirleme
  const displayCurrency = order.paymentCurrency || (locale === 'en' ? 'USD' : 'TRY')
  const conversionRate = order.conversionRate ?? (await (async () => {
    try {
      const { baseCurrency, rates } = await getCurrencyData()
      const map = new Map(rates.map(r => [r.currency, r.rate]))
      const baseRate = Number(map.get(baseCurrency)) || 1
      const displayRate = Number(map.get(displayCurrency)) || baseRate
      return displayRate / baseRate
    } catch {
      return 1
    }
  })())

  const nfLocale = locale?.startsWith('en') ? 'en-US' : 'tr-TR'
  const fmt = (amount: number) => new Intl.NumberFormat(nfLocale, { style: 'currency', currency: displayCurrency }).format(amount)
  const tInstallments = await getTranslations('payment.installments')

  // System settings for VAT and shipping (VAT rate should not be hardcoded)
  const setting = await prisma.systemSetting.findFirst()
  const vatRate = typeof setting?.vatRate === 'number' ? setting!.vatRate : 0.18

  const subtotalBase = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const taxBase = subtotalBase * vatRate
  const shippingBase = order.shippingCost || 0
  const totalBase = subtotalBase + taxBase + shippingBase

  const subtotal = subtotalBase * conversionRate
  const tax = taxBase * conversionRate
  const shipping = shippingBase * conversionRate
  // Toplam tutar, görünüm için her zaman ara kalemlerin toplamı olarak hesaplanır
  const total = subtotal + tax + shipping

  // Ödeme sırasında seçilen taksit sayısı ve olası hizmet bedeli
  const installmentCount = typeof order.installmentCount === 'number' ? order.installmentCount : 1
  const paidAmountDisplay = typeof order.paidAmount === 'number' ? order.paidAmount : total
  // Eğer siparişte serviceFee kaydedildiyse (taban para biriminde), görüntü para birimine çevir
  const serviceFee = typeof order.serviceFee === 'number' && !Number.isNaN(order.serviceFee)
    ? order.serviceFee * conversionRate
    : Math.max(0, paidAmountDisplay - total)
  // Genel toplam: ara kalemler + ek hizmet bedeli
  const grandTotal = total + serviceFee

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
                    {tOrder('quantity')}: {item.quantity} × {fmt(item.price * conversionRate)}
                  </p>
                </div>
                <div className="font-medium">
                  {fmt(item.price * item.quantity * conversionRate)}
                </div>
              </div>
            ))}

            <div className="space-y-2 pt-4">
              <div className="flex justify-between">
                <span>{tOrder('subtotal')}:</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>{tOrder('tax')} (%{(vatRate * 100).toFixed(0)}):</span>
                <span>{fmt(tax)}</span>
              </div>
              <div className="flex justify-between">
                <span>{tOrder('shipping')}:</span>
                <span>{fmt(shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span>{locale?.startsWith('en') ? 'Installments' : 'Taksit'}:</span>
                <span>{installmentCount <= 1 ? tInstallments('singlePayment') : tInstallments('installmentCount', { count: installmentCount })}</span>
              </div>
              <div className="flex justify-between">
                <span>{tOrder('serviceFee')}:</span>
                <span>{fmt(serviceFee)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>{tOrder('total')}:</span>
                <span>{fmt(grandTotal)}</span>
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
    <Suspense fallback={<PaymentSuccessFallback />}>
      <PaymentSuccessContent {...props} />
    </Suspense>
  )
}

function PaymentSuccessFallback() {
  return (
    <div className="container max-w-4xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Loader2 className="h-16 w-16 text-green-500 animate-spin" />
        </div>
        <div className="h-6 bg-muted rounded w-40 mx-auto animate-pulse" />
        <div className="h-4 bg-muted rounded w-64 mx-auto mt-2 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-lg border p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </div>
        </div>

        <div className="rounded-lg border p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
            <div className="h-4 bg-muted rounded w-3/6" />
            <div className="h-4 bg-muted rounded w-2/6" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-6 mt-8 animate-pulse">
        <div className="h-6 bg-muted rounded w-36 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
          <div className="h-4 bg-muted rounded w-4/6" />
          <div className="h-5 bg-muted rounded w-3/6 mt-2" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
        <div className="h-10 bg-muted rounded w-40 animate-pulse" />
        <div className="h-10 bg-muted rounded w-40 animate-pulse" />
      </div>
    </div>
  )
}