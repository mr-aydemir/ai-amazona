'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function PaymentErrorPage() {
  const t = useTranslations('payment')
  const searchParams = useSearchParams()
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    setError(errorParam || 'unknown_error')
  }, [searchParams])

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case '3ds_failed':
        return {
          title: '3D Secure Doğrulama Başarısız',
          description: '3D Secure doğrulaması tamamlanamadı. Lütfen kartınızın 3D Secure özelliğinin aktif olduğundan emin olun.'
        }
      case 'payment_failed':
        return {
          title: 'Ödeme Başarısız',
          description: 'Ödeme işlemi tamamlanamadı. Lütfen kart bilgilerinizi kontrol edin ve tekrar deneyin.'
        }
      case 'unauthorized':
        return {
          title: 'Yetkilendirme Hatası',
          description: 'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın ve ödeme işlemini tekrarlayın.'
        }
      case 'callback_failed':
        return {
          title: 'İşlem Hatası',
          description: 'Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.'
        }
      case 'invalid_callback_method':
        return {
          title: 'Geçersiz İstek',
          description: 'Ödeme işlemi geçersiz bir şekilde başlatıldı. Lütfen tekrar deneyin.'
        }
      default:
        return {
          title: 'Ödeme Hatası',
          description: 'Ödeme işlemi sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
        }
    }
  }

  const errorInfo = getErrorMessage(error)

  const handleRetryPayment = () => {
    window.location.href = '/checkout'
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl font-semibold text-red-600 dark:text-red-400">
            {errorInfo.title}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
            {errorInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>Hata Kodu:</strong> {error}
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handleRetryPayment}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Ödemeyi Tekrar Dene
            </Button>
            
            <Button 
              onClick={handleGoHome}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Sorun devam ederse lütfen müşteri hizmetleri ile iletişime geçin.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}