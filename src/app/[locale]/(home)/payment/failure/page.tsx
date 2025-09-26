import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle, AlertTriangle, CreditCard, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ error?: string; orderId?: string }>
}

async function PaymentFailureContent({ searchParams }: PageProps) {
  const session = await auth()
  const { error, orderId } = await searchParams

  if (!session?.user?.id) {
    redirect('/api/auth/signin')
  }

  const getErrorMessage = (errorCode?: string) => {
    switch (errorCode) {
      case 'missing_token':
        return 'Ödeme token\'ı bulunamadı. Lütfen tekrar deneyin.'
      case 'callback_error':
        return 'Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.'
      case 'insufficient_funds':
        return 'Yetersiz bakiye. Lütfen farklı bir kart deneyin.'
      case 'card_declined':
        return 'Kartınız reddedildi. Lütfen banka ile iletişime geçin.'
      case 'expired_card':
        return 'Kartınızın süresi dolmuş. Lütfen farklı bir kart kullanın.'
      case 'invalid_cvc':
        return 'Geçersiz CVC kodu. Lütfen kontrol edin.'
      case 'processing_error':
        return 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.'
      default:
        return error ? decodeURIComponent(error) : 'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.'
    }
  }

  const errorMessage = getErrorMessage(error)

  return (
    <div className="container max-w-4xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-red-600 mb-2">
          Ödeme Başarısız
        </h1>
        <p className="text-lg text-muted-foreground">
          Ödeme işleminiz tamamlanamadı.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Hata Detayı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">
              {errorMessage}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Ne Yapabilirsiniz?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Tekrar Deneyin</h4>
                <p className="text-sm text-muted-foreground">
                  Ödeme işlemini tekrar deneyebilirsiniz. Geçici bir sorun olabilir.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Farklı Kart Kullanın</h4>
                <p className="text-sm text-muted-foreground">
                  Başka bir kredi kartı veya banka kartı ile ödeme yapabilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Banka ile İletişime Geçin</h4>
                <p className="text-sm text-muted-foreground">
                  Kartınızda bir sorun varsa, bankanız ile iletişime geçebilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {orderId && (
          <Button asChild>
            <Link href={`/payment/${orderId}`}>
              Tekrar Ödeme Yap
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/cart">
            Sepete Dön
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            Ana Sayfaya Dön
          </Link>
        </Button>
      </div>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Yardıma mı İhtiyacınız Var?
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
          Ödeme konusunda sorun yaşıyorsanız, müşteri hizmetlerimiz size yardımcı olabilir.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/contact">
              İletişime Geç
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/help">
              Yardım Merkezi
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Siparişiniz henüz oluşturulmadı. Ödeme tamamlandıktan sonra siparişiniz işleme alınacaktır.
        </p>
      </div>
    </div>
  )
}

export default function PaymentFailurePage(props: PageProps) {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <PaymentFailureContent {...props} />
    </Suspense>
  )
}