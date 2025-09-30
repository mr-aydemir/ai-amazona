'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useCart } from '@/store/use-cart'
import { useToast } from '@/hooks/use-toast'
import { AddressSelector } from './address-selector'
import { Address } from '@prisma/client'

export function ShippingForm() {
  const router = useRouter()
  const { items } = useCart()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)

  // Handle address selection
  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address)
  }

  async function handleContinueToPayment() {
    if (!selectedAddress) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Lütfen bir adres seçin veya yeni adres ekleyin.',
      })
      return
    }

    try {
      setLoading(true)
      console.log('[SHIPPING_FORM] Creating order with selected address:', selectedAddress)

      const subtotal = items.reduce((total, item) => {
        return total + item.price * item.quantity
      }, 0)

      const shipping = 10 // Fixed shipping cost
      const tax = subtotal * 0.1 // 10% tax
      const total = subtotal + shipping + tax

      console.log('[SHIPPING_FORM] Calculated totals:', { subtotal, shipping, tax, total })
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
          subtotal,
          tax,
          shipping,
          total,
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
        title: 'Hata',
        description: 'Bir şeyler yanlış gitti. Lütfen tekrar deneyin.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Address Selector */}
      <AddressSelector onAddressSelect={handleAddressSelect} />
      
      {/* Continue to Payment Button */}
      <Button 
        onClick={handleContinueToPayment} 
        className='w-full' 
        disabled={loading || !selectedAddress}
      >
        {loading ? 'Sipariş Oluşturuluyor...' : 'Ödemeye Devam Et'}
      </Button>
    </div>
  )
}
