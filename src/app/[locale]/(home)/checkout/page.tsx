import { redirect } from 'next/navigation'
import { ShippingForm } from '@/components/checkout/shipping-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { auth } from '@/auth'
import { OrderSummary } from '@/components/checkout/order-summary'
import CheckoutSteps from '@/components/checkout/checkout-steps'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

export default async function CheckoutPage() {
  const session = await auth()
  const t = await getTranslations('cart')

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/checkout')
  }

  return (
    <div className='container max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 min-h-screen'>
      {/* Checkout Steps - En üstte */}
      <CheckoutSteps currentStep={1} />

      <h1 className='text-3xl font-bold mb-10 mt-8 text-gray-900 dark:text-white'>{t('checkout.title')}</h1>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <div>
          <Card className="shadow-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader className="bg-gray-50 dark:bg-gray-700/50">
              <CardTitle className="text-gray-900 dark:text-white">{t('checkout.shipping_info')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ShippingForm />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="shadow-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader className="bg-gray-50 dark:bg-gray-700/50">
              <CardTitle className="text-gray-900 dark:text-white">{t('checkout.order_summary')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <OrderSummary />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
