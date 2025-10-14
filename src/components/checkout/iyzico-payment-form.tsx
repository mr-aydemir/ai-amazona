'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { useCurrencyStore } from '@/store/use-currency'

interface IyzicoPaymentFormProps {
  orderId: string
}

export function IyzicoPaymentForm({ orderId }: IyzicoPaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const t = useTranslations('payment')
  const locale = useLocale()
  const iyzicoLogoSrc = locale === 'tr'
    ? '/images/iyzico/tr/iyzico_ile_ode_colored_horizontal.svg'
    : '/images/iyzico/en/pay_with_iyzico_horizontal_colored.svg'

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
        // Decode base64 HTML content
        let decodedHtml = data.checkoutFormContent
        try {
          // Check if content is base64 encoded
          if (data.checkoutFormContent.match(/^[A-Za-z0-9+/]+=*$/)) {
            decodedHtml = atob(data.checkoutFormContent)
          }
        } catch (error) {
          console.log('Content is not base64, using as is')
        }

        // Redirect to checkout form page directly
        const newWindow = window.open('', '_self')
        if (newWindow) {
          newWindow.document.write(decodedHtml)
          newWindow.document.close()
        } else {
          // Fallback: replace current page content
          document.open()
          document.write(decodedHtml)
          document.close()
        }
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

  return (
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
          <p>• {t('security.features.threeDSecure')}</p>
          <p>• {t('security.features.sslCertificate')}</p>
          <p>• {t('security.features.installmentOptions')}</p>
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
  )
}