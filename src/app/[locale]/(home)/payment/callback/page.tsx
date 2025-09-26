import { Suspense } from 'react'
import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{ token?: string; status?: string }>
}

async function CallbackContent({ searchParams }: PageProps) {
  const { token, status } = await searchParams

  // Bu sayfa sadece yönlendirme için kullanılır
  // Gerçek işlem API route'unda yapılır
  if (!token) {
    redirect('/payment/failure?error=missing_token')
  }

  // Loading state göster, API callback işlemi devam ediyor
  return (
    <div className="container max-w-4xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold mb-2">Ödeme İşleniyor</h1>
        <p className="text-muted-foreground">
          Ödeme durumunuz kontrol ediliyor, lütfen bekleyin...
        </p>
      </div>
    </div>
  )
}

export default function PaymentCallbackPage(props: PageProps) {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <CallbackContent {...props} />
    </Suspense>
  )
}