'use client'

import { Suspense, useEffect } from 'react'
import { CheckCircle, Package, CreditCard, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useCart } from '@/store/use-cart'

interface PaymentSuccessPageProps {
  searchParams: Promise<{
    orderId?: string
    paymentId?: string
  }>
}

function PaymentSuccessContent({ searchParams }: { searchParams: { orderId?: string; paymentId?: string } }) {
  const { orderId, paymentId } = searchParams
  const cart = useCart()

  // Clear cart when payment success page loads (for 3DS payments)
  useEffect(() => {
    cart.clearCart()
  }, [cart])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">
            Ödeme Başarılı!
          </CardTitle>
          <p className="text-gray-600 mt-2">
            3D Secure ile güvenli ödemeniz başarıyla tamamlandı.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Payment Details */}
          <div className="space-y-3">
            {orderId && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Sipariş No:</span>
                </div>
                <span className="text-sm font-mono text-gray-900">#{orderId.slice(-8).toUpperCase()}</span>
              </div>
            )}

            {paymentId && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Ödeme ID:</span>
                </div>
                <span className="text-sm font-mono text-gray-900">#{paymentId.slice(-8).toUpperCase()}</span>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Tarih:</span>
              </div>
              <span className="text-sm text-gray-900">
                {new Date().toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              Siparişiniz başarıyla alındı ve işleme konuldu. 
              Kargo takip bilgileri e-posta adresinize gönderilecektir.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button asChild className="w-full bg-green-600 hover:bg-green-700">
              <Link href={orderId ? `/account/orders/${orderId}` : '/account/orders'}>
                Sipariş Detaylarını Görüntüle
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                Alışverişe Devam Et
              </Link>
            </Button>
          </div>

          {/* Support Info */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              Herhangi bir sorun yaşarsanız{' '}
              <Link href="/contact" className="text-green-600 hover:underline">
                müşteri hizmetleri
              </Link>
              {' '}ile iletişime geçebilirsiniz.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    }>
      <PaymentSuccessContent searchParams={resolvedSearchParams} />
    </Suspense>
  )
}