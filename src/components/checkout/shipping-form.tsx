'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useCart } from '@/store/use-cart'
import { useToast } from '@/hooks/use-toast'
import { AddressSelector } from './address-selector'
import { Address } from '@prisma/client'
import CheckoutSteps from './checkout-steps'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ShippingFormProps {
  termsHtml: string | null
  privacyHtml: string | null
}

export function ShippingForm({ termsHtml, privacyHtml }: ShippingFormProps) {
  const t = useTranslations('payment')
  const router = useRouter()
  const { items } = useCart()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)

  // Modal states and content
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  // Content is provided via server-side props, no client fetching

  // Handle address selection
  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address)
  }

  function openTerms() {
    setTermsOpen(true)
  }

  function openPrivacy() {
    setPrivacyOpen(true)
  }

  async function handleContinueToPayment() {
    if (!selectedAddress) {
      toast({
        variant: 'destructive',
        title: t('messages.error'),
        description: t('messages.selectAddress'),
      })
      return
    }

    try {
      setLoading(true)
      console.log('[SHIPPING_FORM] Creating order with selected address:', selectedAddress)

      console.log('[SHIPPING_FORM] Cart items:', items)

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items,
          shippingInfo: {
            fullName: selectedAddress.fullName,
            email: '', // Email will be taken from user session
            phone: selectedAddress.phone || '',
            tcNumber: selectedAddress.tcNumber || '',
            street: selectedAddress.street,
            city: selectedAddress.city,
            state: selectedAddress.state,
            postalCode: selectedAddress.postalCode,
            country: selectedAddress.country,
          },
        }),
      })

      console.log('[SHIPPING_FORM] API response status:', response.status)
      console.log('[SHIPPING_FORM] API response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[SHIPPING_FORM] API error response:', errorText)
        throw new Error('Failed to create order')
      }

      const responseData = await response.json()
      console.log('[SHIPPING_FORM] API response data:', responseData)
      const { orderId } = responseData

      if (!orderId) {
        console.error('[SHIPPING_FORM] No orderId in response')
        throw new Error('No order ID received')
      }

      console.log('[SHIPPING_FORM] Redirecting to payment page with orderId:', orderId)

      // Redirect to payment page
      router.push(`/payment/${orderId}`)
    } catch (error) {
      console.error('[SHIPPING_FORM]', error)
      toast({
        variant: 'destructive',
        title: t('messages.error'),
        description: t('messages.orderCreateError'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Checkout Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">{t('checkout.orderCompletion')}</h1>
        <p className="text-muted-foreground">
          {t('checkout.orderCompletionDescription')}
        </p>
      </div>

      {/* Address Selector */}
      <AddressSelector onAddressSelect={handleAddressSelect} />

      {/* Order Summary Info */}
      {selectedAddress && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-success-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-success-800">
                {t('checkout.deliveryAddressSelected')}
              </h3>
              <div className="mt-2 text-sm text-success-700">
                <p>{t('checkout.orderWillBeDelivered', { name: selectedAddress.fullName })}</p>
                <p className="mt-1">{selectedAddress.street}, {selectedAddress.city}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Continue to Payment Button */}
      <div className="space-y-3">
        <Button
          onClick={handleContinueToPayment}
          className='w-full h-12 text-lg'
          disabled={loading || !selectedAddress}
        >
          {loading ? t('buttons.creatingOrder') : t('buttons.continueToPayment')}
        </Button>

        {!selectedAddress && (
          <p className="text-sm text-center text-muted-foreground">
            {t('checkout.selectAddressToContinue')}
          </p>
        )}

        <p className="text-xs text-center text-muted-foreground">
          {t('checkout.termsAcceptance')}{' '}
          <button type="button" onClick={openTerms} className="underline hover:text-primary">
            {t('checkout.termsOfService')}
          </button>{' '}
          {t('checkout.and')}{' '}
          <button type="button" onClick={openPrivacy} className="underline hover:text-primary">
            {t('checkout.privacyPolicy')}
          </button>
          {t('checkout.acceptanceText')}
        </p>

        {/* Terms Modal */}
        <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('checkout.termsOfService')}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto text-sm">
              {termsHtml ? (
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: termsHtml }}
                />
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  {t('messages.notFound')}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Privacy Modal */}
        <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('checkout.privacyPolicy')}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto text-sm">
              {privacyHtml ? (
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: privacyHtml }}
                />
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  {t('messages.notFound')}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
