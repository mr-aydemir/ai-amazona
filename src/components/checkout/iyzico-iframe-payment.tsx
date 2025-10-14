'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTranslations, useLocale } from 'next-intl'
import { useCurrencyStore } from '@/store/use-currency'

interface IyzicoIframePaymentProps {
  orderId: string
}

export function IyzicoIframePayment({ orderId }: IyzicoIframePaymentProps) {
  const t = useTranslations('payment')
  const locale = useLocale()
  const iyzicoLogoSrc = locale === 'tr'
    ? '/images/iyzico/tr/iyzico_ile_ode_colored_horizontal.svg'
    : '/images/iyzico/en/pay_with_iyzico_horizontal_colored.svg'
  const [isLoading, setIsLoading] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [checkoutFormContent, setCheckoutFormContent] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handlePayment = async () => {
    try {
      setIsLoading(true)
      console.log('Starting payment process for orderId:', orderId)
      const currency = useCurrencyStore.getState().displayCurrency

      const response = await fetch('/api/iyzico/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, currency }),
      })

      console.log('API Response status:', response.status)
      console.log('API Response ok:', response.ok)

      const data = await response.json()
      console.log('API Response data:', data)

      if (!response.ok) {
        console.error('API Error:', data)
        throw new Error(data.error || data.details || t('error.payment_failed.description'))
      }

      if (data.success && data.checkoutFormContent) {
        console.log('Payment form content received, opening iframe modal')
        setCheckoutFormContent(data.checkoutFormContent)
        setIsPaymentModalOpen(true)
      } else {
        console.error('Invalid response format:', data)
        throw new Error(t('error.completion_failed.description'))
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : t('error.unknown.description'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseModal = () => {
    setIsPaymentModalOpen(false)
    setCheckoutFormContent('')
    // Sayfa yenilenmesi veya sipariş durumu kontrolü
    window.location.reload()
  }

  useEffect(() => {
    if (isPaymentModalOpen && checkoutFormContent && iframeRef.current) {
      // HTML içeriğini blob URL olarak oluştur
      const blob = new Blob([checkoutFormContent], { type: 'text/html' })
      const blobUrl = URL.createObjectURL(blob)

      // Iframe'e blob URL'ini yükle
      iframeRef.current.src = blobUrl

      // Cleanup function
      return () => {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [isPaymentModalOpen, checkoutFormContent])

  // Iframe'den gelen mesajları dinle (ödeme tamamlandığında)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // İyzico'dan gelen mesajları kontrol et
      if (event.origin.includes('iyzipay.com') || event.origin.includes('iyzico.com')) {
        console.log('Message from iyzico:', event.data)

        // Ödeme tamamlandığında modal'ı kapat
        if (event.data.type === 'payment_completed' || event.data.includes('success')) {
          handleCloseModal()
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <>
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t('security.title')}
          </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {t('security.securePaymentDescription')}
        </p>
        <img
          src={iyzicoLogoSrc}
          alt={locale === 'tr' ? 'İyzico ile Öde' : 'Pay with iyzico'}
          className="mt-3 h-8 w-auto"
          loading="lazy"
          decoding="async"
        />
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
              {t('supportedCards.allCardsAccepted')}
            </span>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>{t('security.features.threeDSecure')}</p>
            <p>{t('security.features.sslCertificate')}</p>
            <p>{t('security.features.installmentOptions')}</p>
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
              {t('buttons.paymentProcessing')}
            </>
          ) : (
            t('buttons.securePayment')
          )}
        </Button>

        <div className="text-xs text-center text-muted-foreground">
          {t('terms.agreementText')}{' '}
          <a href="#" className="underline hover:text-primary">
            {t('terms.termsOfService')}
          </a>{' '}
          {t('terms.and')}{' '}
          <a href="#" className="underline hover:text-primary">
            {t('terms.privacyPolicy')}
          </a>
          {t('terms.acceptSuffix')}
        </div>
      </div>

      {/* İyzico Payment Modal with Iframe */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{t('iyzico.title')}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 p-4 pt-0">
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0 rounded-lg"
              title="İyzico Payment Form"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-popups-to-escape-sandbox"
              style={{ minHeight: '600px' }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}