'use client'

import { Suspense, useEffect } from 'react'
import { CheckCircle, Package, CreditCard, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useCart } from '@/store/use-cart'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import CheckoutSteps from '@/components/checkout/checkout-steps'

interface PaymentSuccessPageProps {
  searchParams?: {
    orderId?: string
    paymentId?: string
  }
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const paymentId = searchParams.get('paymentId')
  const cart = useCart()
  const t = useTranslations('payment')

  // Clear cart when payment success page loads (for 3DS payments)
  useEffect(() => {
    cart.clearCart()
  }, [cart])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Checkout Steps - En üstte */}
      <CheckoutSteps currentStep={3} />
      
      <div className="container max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md mx-auto shadow-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <CardHeader className="text-center bg-gray-50 dark:bg-gray-700/50">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-800 dark:text-green-400">
                {t('success.title')}
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                {t('success.description')}
              </p>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              {/* Order Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('orderDetails.orderNumber')}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                    {orderId ? `#${orderId.slice(-8)}` : '#12345678'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('orderDetails.paymentId')}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                    {paymentId ? `#${paymentId.slice(-8)}` : '#87654321'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('orderDetails.date')}
                    </span>
                  </div>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {new Date().toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>

              {/* Success Message */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {t('success.orderReceived')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/dashboard/orders">
                    {t('buttons.viewOrderDetails')}
                  </Link>
                </Button>
                
                <Button variant="outline" asChild className="w-full">
                  <Link href="/products">
                    {t('buttons.continueShopping')}
                  </Link>
                </Button>
              </div>

              {/* Support Information */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
                <p>
                  {t('support.contactMessage')} <Link href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">{t('support.customerService')}</Link> {t('support.contactSuffix')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}