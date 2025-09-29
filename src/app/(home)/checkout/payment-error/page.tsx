import { Suspense } from 'react'
import { XCircle, AlertTriangle, CreditCard, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

interface PaymentErrorPageProps {
  searchParams: Promise<{
    error?: string
    message?: string
    conversationId?: string
  }>
}

function getErrorDetails(error: string, message?: string) {
  switch (error) {
    case '3ds_failed':
      return {
        title: '3D Secure Doğrulama Başarısız',
        description: '3D Secure doğrulama işlemi başarısız oldu. Lütfen kart bilgilerinizi kontrol ederek tekrar deneyin.',
        icon: <CreditCard className="w-8 h-8 text-red-600" />
      }
    case 'payment_failed':
      return {
        title: 'Ödeme Başarısız',
        description: message || 'Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.',
        icon: <XCircle className="w-8 h-8 text-red-600" />
      }
    case 'unauthorized':
      return {
        title: 'Yetkilendirme Hatası',
        description: 'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.',
        icon: <AlertTriangle className="w-8 h-8 text-orange-600" />
      }
    case 'invalid_data':
      return {
        title: 'Geçersiz Veri',
        description: 'Sepet veya adres bilgilerinizde bir sorun var. Lütfen kontrol edin.',
        icon: <AlertTriangle className="w-8 h-8 text-orange-600" />
      }
    case 'completion_failed':
      return {
        title: 'Ödeme Tamamlanamadı',
        description: 'Ödeme işlemi tamamlanırken bir hata oluştu. Müşteri hizmetleri ile iletişime geçin.',
        icon: <XCircle className="w-8 h-8 text-red-600" />
      }
    case 'callback_error':
      return {
        title: 'Sistem Hatası',
        description: 'Ödeme işlemi sırasında sistem hatası oluştu. Lütfen tekrar deneyin.',
        icon: <XCircle className="w-8 h-8 text-red-600" />
      }
    case 'invalid_callback_method':
      return {
        title: 'Geçersiz Callback',
        description: 'Ödeme callback işlemi geçersiz. Lütfen tekrar deneyin.',
        icon: <AlertTriangle className="w-8 h-8 text-orange-600" />
      }
    default:
      return {
        title: 'Ödeme Hatası',
        description: message || 'Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.',
        icon: <XCircle className="w-8 h-8 text-red-600" />
      }
  }
}

function PaymentErrorContent({ searchParams }: { searchParams: { error?: string; message?: string; conversationId?: string } }) {
  const { error = 'unknown', message, conversationId } = searchParams
  const errorDetails = getErrorDetails(error, message)

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            {errorDetails.icon}
          </div>
          <CardTitle className="text-2xl font-bold text-red-800">
            {errorDetails.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Description */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {errorDetails.description}
            </AlertDescription>
          </Alert>

          {/* Error Details */}
          {conversationId && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">İşlem ID:</span>
                <span className="text-sm font-mono text-gray-900">#{conversationId.slice(-8).toUpperCase()}</span>
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Öneriler:</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Kart bilgilerinizi kontrol edin</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Kart limitinizi kontrol edin</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Farklı bir kart ile deneyin</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>İnternet bağlantınızı kontrol edin</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button asChild className="w-full bg-red-600 hover:bg-red-700">
              <Link href="/checkout">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ödeme Sayfasına Dön
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link href="/cart">
                Sepeti Görüntüle
              </Link>
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/">
                Ana Sayfaya Dön
              </Link>
            </Button>
          </div>

          {/* Support Info */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              Sorun devam ederse{' '}
              <Link href="/contact" className="text-red-600 hover:underline">
                müşteri hizmetleri
              </Link>
              {' '}ile iletişime geçin.
            </p>
            {conversationId && (
              <p className="text-xs text-gray-400 mt-1">
                Destek talebi oluştururken işlem ID'sini belirtin.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function PaymentErrorPage({ searchParams }: PaymentErrorPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    }>
      <PaymentErrorContent searchParams={resolvedSearchParams} />
    </Suspense>
  )
}