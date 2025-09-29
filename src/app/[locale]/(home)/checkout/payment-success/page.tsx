'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Package, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/store/use-cart'

interface OrderData {
  id: string
  status: string
  total: number
  createdAt: string
  paidAt: string | null
  iyzicoPaymentId: string | null
  stripePaymentId: string | null
}

export default function PaymentSuccessPage() {
  const t = useTranslations('payment')
  const searchParams = useSearchParams()
  const router = useRouter()
  const { clearCart } = useCart()
  const [orderId, setOrderId] = useState<string>('')
  const [paymentId, setPaymentId] = useState<string>('')
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Order status'u kontrol etmek için API çağrısı
  const checkOrderStatus = async (orderIdParam: string) => {
    try {
      const response = await fetch(`/api/orders/${orderIdParam}`)
      if (response.ok) {
        const data = await response.json()
        setOrderData(data)
        
        // Eğer order PAID durumundaysa (confirmed), sepeti temizle
        if (data.status === 'PAID' && data.paidAt) {
          console.log('Order confirmed, clearing cart...')
          clearCart()
          
          // Popup'ı kapat (3 saniye sonra)
          setTimeout(() => {
            if (window.opener) {
              window.close()
            }
          }, 3000)
        }
      }
    } catch (error) {
      console.error('Error checking order status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId')
    const paymentIdParam = searchParams.get('paymentId')

    setOrderId(orderIdParam || '')
    setPaymentId(paymentIdParam || '')

    if (orderIdParam) {
      checkOrderStatus(orderIdParam)
    } else {
      setIsLoading(false)
    }
  }, [searchParams, clearCart])

  const handleViewOrder = () => {
    if (orderId) {
      router.push(`/order-confirmation/${orderId}`)
    } else {
      router.push('/dashboard/orders')
    }
  }

  const handleContinueShopping = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-xl font-semibold text-green-600 dark:text-green-400">
            {t('success.title')}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
            {t('success.message')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderId && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>{t('success.order_number')}:</strong> {orderId}
              </p>
              {paymentId && (
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  <strong>Ödeme No:</strong> {paymentId}
                </p>
              )}
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">{t('success.next_steps')}</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {t('success.next_steps_description')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleViewOrder}
              className="w-full"
              variant="default"
            >
              <Package className="w-4 h-4 mr-2" />
              {t('success.view_orders')}
            </Button>

            <Button
              onClick={handleContinueShopping}
              variant="outline"
              className="w-full"
            >
              {t('success.continue_shopping')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>{t('success.thank_you')} {t('success.email_confirmation')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}