'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface IyzicoInlinePaymentProps {
  orderId: string
}

export function IyzicoInlinePayment({ orderId }: IyzicoInlinePaymentProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [payWithIyzicoPageUrl, setPayWithIyzicoPageUrl] = useState<string>('')
  const router = useRouter()

  // Sentry hatalarını bastır
  useEffect(() => {
    // Sentry hatalarını yakalayıp bastır
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Sentry ile ilgili hataları bastır
      const errorMessage = args.join(' ');
      if (errorMessage.includes('sentry.io') || errorMessage.includes('ERR_CONNECTION_TIMED_OUT')) {
        console.warn('Sentry error suppressed:', errorMessage);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    // Network hatalarını yakalayıp bastır
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        return await originalFetch.apply(window, args);
      } catch (error) {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('sentry.io')) {
          console.warn('Sentry network error suppressed:', error);
          // Sentry hatası için boş response döndür
          return new Response('{}', { status: 200 });
        }
        throw error;
      }
    };

    return () => {
      console.error = originalConsoleError;
      window.fetch = originalFetch;
    };
  }, []);

  const handlePayment = async () => {
    try {
      setIsLoading(true)
      console.log('Starting payment process for orderId:', orderId)

      const response = await fetch('/api/iyzico/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      })

      console.log('API Response status:', response.status)
      console.log('API Response ok:', response.ok)

      const data = await response.json()
      console.log('API Response data:', data)

      if (!response.ok) {
        console.error('API Error:', data)
        throw new Error(data.error || data.details || 'Ödeme başlatılamadı')
      }

      if (data.success && (data.checkoutFormContent || data.paymentPageUrl)) {
        if (data.paymentPageUrl) {
          console.log('Payment URL received, displaying iframe')
          console.log('paymentPageUrl:', data.paymentPageUrl)
          setPayWithIyzicoPageUrl(data.paymentPageUrl)
          setShowPaymentForm(true)
        } else if (data.checkoutFormContent) {
          console.log('Payment form content received, rendering inline')
          // Inline form rendering logic here
          setShowPaymentForm(true)
        }
      } else {
        console.error('Invalid response format:', data)
        throw new Error('Ödeme formu oluşturulamadı')
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Ödeme sırasında bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToPayment = () => {
    setShowPaymentForm(false)
    setPayWithIyzicoPageUrl('')
  }

  // iyzico iframe message handling
  useEffect(() => {
    // Listen for iyzico messages from iframe
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message:', event.data, 'from origin:', event.origin);
      
      // Check if message is from iyzico
      if (event.origin.includes('iyzipay.com') || event.origin.includes('iyzico.com')) {
        if (event.data && typeof event.data === 'object') {
          if (event.data.status === 'success' || event.data.type === 'success') {
            console.log('Payment successful, redirecting to success page');
            window.location.href = `/payment/success?orderId=${orderId}`;
          } else if (event.data.status === 'failure' || event.data.type === 'failure') {
            console.log('Payment failed, redirecting to failure page');
            window.location.href = `/payment/failure?orderId=${orderId}`;
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [orderId]);

  // Ödeme formu gösteriliyorsa, iframe ile render et
  if (payWithIyzicoPageUrl) {
    return (
      <div className="w-full">
        {/* İyzico Payment iframe */}
        <div className="w-full">
          <iframe
            src={payWithIyzicoPageUrl}
            className="w-full h-[600px] border rounded-lg bg-white"
            title="İyzico Güvenli Ödeme"
            allow="payment"
            sandbox="allow-scripts allow-forms allow-top-navigation allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            onLoad={() => {
              console.log('İyzico payment iframe loaded successfully');
            }}
          />
        </div>
        
        {/* Security notice */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Ödeme işlemi güvenli iyzico altyapısı ile gerçekleştirilmektedir. 
                Kredi kartı bilgileriniz şifrelenerek korunmaktadır.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ödeme butonu ve bilgileri
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Güvenli Ödeme
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Ödemeniz İyzico güvenli ödeme sistemi ile korunmaktadır.
          Kredi kartı bilgileriniz şifrelenerek işlenir.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">
            VISA
          </div>
          <div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center font-bold">
            MC
          </div>
          <div className="w-8 h-5 bg-green-600 rounded text-white text-xs flex items-center justify-center font-bold">
            AMEX
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            Tüm kredi kartları kabul edilir
          </span>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>• 3D Secure ile güvenli ödeme</p>
          <p>• SSL sertifikası ile şifrelenmiş bağlantı</p>
          <p>• Taksit seçenekleri mevcut</p>
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full h-12 text-lg font-semibold"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Ödeme Sayfası Yükleniyor...
          </>
        ) : (
          'Güvenli Ödeme Yap'
        )}
      </Button>

      <div className="text-xs text-center text-muted-foreground">
        Bu işlem ile{' '}
        <a href="#" className="underline hover:text-primary">
          Kullanım Şartları
        </a>{' '}
        ve{' '}
        <a href="#" className="underline hover:text-primary">
          Gizlilik Politikası
        </a>
        {"'nı kabul etmiş olursunuz."}
      </div>
    </div>
  )
}