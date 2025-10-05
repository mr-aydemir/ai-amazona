'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, CreditCard, Lock, CheckCircle, XCircle, Shield, Info } from 'lucide-react'
import { z } from 'zod'
import { useTranslations, useLocale } from 'next-intl'
import { useCurrencyStore } from '@/store/use-currency'
import { useCurrency } from '@/components/providers/currency-provider'

interface IyzicoCustomPaymentProps {
  orderId: string
  userEmail: string
  orderItems?: Array<{
    id: string
    product: {
      id: string
      name: string
      images: string
      category?: {
        name: string
      }
    }
    quantity: number
    price: number
  }>
  shippingAddress?: {
    fullName: string
    street: string
    city: string
    state: string
    postalCode: string
    country: string
    phone?: string
    tcNumber?: string
  }
  savedCards?: Array<{
    id: string
    cardToken: string
    cardUserKey: string
    cardAlias: string
    binNumber?: string | null
    lastFourDigits: string
    cardType?: string | null
    cardAssociation?: string | null
    cardFamily?: string | null
    cardBankCode?: string | null
    cardBankName?: string | null
  }>
  onInstallmentChange?: (installment: {
    installmentCount: number
    installmentPrice: number
    totalPrice: number
    currency?: string
  } | null) => void
  }

// Zod validation schema for card details
const createCardSchema = (t: any) => z.object({
  cardNumber: z.string()
    .min(15, t('card.validation.number_min'))
    .max(16, t('card.validation.number_max'))
    .regex(/^\d+$/, t('card.validation.number_digits')),
  expireMonth: z.string()
    .min(2, t('card.validation.month_required'))
    .max(2, t('card.validation.month_required'))
    .regex(/^(0[1-9]|1[0-2])$/, t('card.validation.month_valid')),
  expireYear: z.string()
    .length(2, t('card.validation.year_required'))
    .regex(/^\d{2}$/, t('card.validation.year_valid'))
    .refine((val) => {
      const year = parseInt(val)
      const currentYear = new Date().getFullYear() % 100
      return year >= currentYear && year <= currentYear + 20
    }, t('card.validation.year_valid')),
  cvc: z.string()
    .min(3, t('card.validation.cvc_min'))
    .max(4, t('card.validation.cvc_max'))
    .regex(/^\d+$/, t('card.validation.cvc_digits')),
  cardHolderName: z.string()
    .min(2, t('card.validation.holder_name_min'))
    .max(50, t('card.validation.holder_name_max'))
    .regex(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/, t('card.validation.holder_name_letters')),
  installment: z.string().default('1')
})

type CardFormData = z.infer<ReturnType<typeof createCardSchema>>

// Taksit bilgisi interface'i
interface InstallmentOption {
  installmentNumber: number
  totalPrice: number
  installmentPrice: number
  bankName?: string
  bankCode?: string
  cardFamilyName?: string
  cardType?: string
  cardAssociation?: string
  commercial?: boolean
  force3ds?: boolean
}

// BIN bilgisi interface'i
interface BinInfo {
  binNumber: string
  cardType: string
  cardAssociation: string
  cardFamily: string
  bankName: string
  bankCode: string
  commercial: boolean
}

export function IyzicoCustomPayment({ orderId, userEmail, orderItems, shippingAddress, savedCards: initialSavedCards, onInstallmentChange }: IyzicoCustomPaymentProps) {
  const currency = useCurrencyStore((state) => state.displayCurrency)
  const t = useTranslations('payment')
  const locale = useLocale()
  const { convert } = useCurrency()
  const [isLoading, setIsLoading] = useState(false)
  const [use3DSecure, setUse3DSecure] = useState(false)
  const [saveCard, setSaveCard] = useState(false)
  const [savedCards, setSavedCards] = useState<any[]>([])
  const [selectedSavedCard, setSelectedSavedCard] = useState<string>('')
  const [showSavedCards, setShowSavedCards] = useState(false)
  const [isLoadingSavedCards, setIsLoadingSavedCards] = useState(false)
  const [formData, setFormData] = useState<CardFormData>({
    cardNumber: '',
    expireMonth: '',
    expireYear: '',
    cvc: '',
    cardHolderName: '',
    installment: '1'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [paymentMessage, setPaymentMessage] = useState('')

  // Taksit ve BIN bilgisi state'leri
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([])
  const [binInfo, setBinInfo] = useState<BinInfo | null>(null)
  const [isLoadingInstallments, setIsLoadingInstallments] = useState(false)
  const [isLoadingBin, setIsLoadingBin] = useState(false)
  const [orderTotal, setOrderTotal] = useState(0)
  const [vatRate, setVatRate] = useState<number>(0.1)
  const [shippingFlatFee, setShippingFlatFee] = useState<number>(10)

  // Currency-aware formatter
  const fmt = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)

  // Create card schema with translations
  const cardSchema = createCardSchema(t)

  // Sistem ayarlarından KDV ve kargo ücreti yükle
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/currency', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (typeof data.vatRate === 'number') setVatRate(data.vatRate)
        if (typeof data.shippingFlatFee === 'number') setShippingFlatFee(data.shippingFlatFee)
      } catch (e) {
        // defaults kept
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Sipariş toplamını (ara toplam + kargo + vergi) hesapla
  useEffect(() => {
    if (orderItems && orderItems.length > 0) {
      const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const shipping = shippingFlatFee
      const tax = subtotal * vatRate
      const total = subtotal + shipping + tax
      setOrderTotal(total)
    } else {
      setOrderTotal(0)
    }
  }, [orderItems, vatRate, shippingFlatFee])

  // Kayıtlı kart ile ödeme fonksiyonu
  const handleSavedCardPayment = async () => {
    try {
      // Seçilen kartın cardToken'ını bul
      const selectedCard = savedCards.find(card => card.id === selectedSavedCard)
      if (!selectedCard) {
        toast.error(t('saved_card.not_found'))
        return
      }

      // Seçilen taksit bilgisinden toplam tutarı belirle
      const selectedInstallmentNumber = parseInt(formData.installment)
      const selectedOption = installmentOptions.find(opt => opt.installmentNumber === selectedInstallmentNumber)
      const installmentTotalPrice = selectedOption ? selectedOption.totalPrice : orderTotal
      const installmentCurrency = currency

      const response = await fetch('/api/iyzico/saved-card-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          cardToken: selectedCard.cardToken,
          installment: parseInt(formData.installment),
          use3DS: use3DSecure,
          currency,
          installmentTotalPrice,
          installmentCurrency
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (use3DSecure && result.threeDSHtmlContent) {
          // 3DS için HTML içeriğini decode et ve yönlendir
          let decodedHtml = result.threeDSHtmlContent
          try {
            if (result.threeDSHtmlContent.match(/^[A-Za-z0-9+/]+=*$/)) {
              decodedHtml = atob(result.threeDSHtmlContent)
            }
          } catch (e) {
            console.warn('Base64 decode failed, using content as-is')
          }

          // 3DS sayfasını aynı sekmede aç (yeni kartla ödeme ile tutarlı)
          const newWindow = window.open('', '_self')
          if (newWindow) {
            newWindow.document.write(decodedHtml)
            newWindow.document.close()
          } else {
            // Fallback: mevcut sayfa içeriğini değiştir
            document.open()
            document.write(decodedHtml)
            document.close()
          }
        } else {
          // Direkt ödeme başarılı
          setPaymentStatus('success')
          setPaymentMessage(t('messages.payment_success'))
          toast.success(t('messages.payment_success'))

          // Sepeti temizle
          const { useCart } = await import('@/store/use-cart')
          useCart.getState().clearCart()

          // Başarı sayfasına yönlendir
          setTimeout(() => {
            window.location.href = `/payment/success?orderId=${orderId}`
          }, 2000)
        }
      } else {
        setPaymentStatus('error')
        setPaymentMessage(result.error || t('messages.payment_failed'))
        toast.error(result.error || t('messages.payment_failed'))
      }
    } catch (error) {
      console.error('Saved card payment error:', error)
      setPaymentStatus('error')
      setPaymentMessage(t('messages.error_occurred'))
      toast.error(t('messages.payment_error'))
    }
  }

  // Kayıtlı kartı sil
  const handleDeleteSavedCard = async (cardId: string) => {
    try {
      const response = await fetch(`/api/saved-cards/${cardId}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (result.success) {
        setSavedCards(prev => prev.filter(card => card.id !== cardId))
        if (selectedSavedCard === cardId) {
          handleSavedCardSelection('')
        }
        toast.success(t('saved_card.delete_success'))
      } else {
        toast.error(t('saved_card.delete_failed'))
      }
    } catch (error) {
      console.error('Delete card error:', error)
      toast.error(t('saved_card.delete_error'))
    }
  }

  // Kayıtlı kart seçimi değiştiğinde taksit bilgilerini güncelle
  const handleSavedCardSelection = async (cardId: string) => {
    setSelectedSavedCard(cardId)

    if (cardId) {
      // Seçilen kartın BIN bilgisini al
      const selectedCard = savedCards.find(card => card.id === cardId)
      if (selectedCard && selectedCard.binNumber) {
        // BIN bilgisi ve taksit seçeneklerini güncelle
        await queryBinInfo(selectedCard.binNumber)
      }
    } else {
      // Yeni kart seçildiğinde BIN ve taksit bilgilerini temizle
      setBinInfo(null)
      setInstallmentOptions([])
      // Taksit seçimini sıfırla
      setFormData(prev => ({ ...prev, installment: '1' }))
      // Parent component'e bildir
      if (onInstallmentChange) {
        onInstallmentChange(null)
      }
    }
  }
  useEffect(() => {
    const loadSavedCards = async () => {
      setIsLoadingSavedCards(true)
      try {
        const response = await fetch('/api/saved-cards')
        const result = await response.json()
        if (result.success) {
          setSavedCards(result.cards || [])
          setShowSavedCards(result.cards?.length > 0)
        }
      } catch (error) {
        console.error('Kayıtlı kartlar yüklenemedi:', error)
      } finally {
        setIsLoadingSavedCards(false)
      }
    }

    // Eğer sunucudan kayıtlı kartlar geldiyse onları kullan; yoksa client-side yükle
    if (initialSavedCards !== undefined) {
      setSavedCards(initialSavedCards || [])
      setShowSavedCards((initialSavedCards || []).length > 0)
      setIsLoadingSavedCards(false)
    } else {
      loadSavedCards()
    }
  }, [initialSavedCards])

  // BIN bilgisi sorgula
  const queryBinInfo = async (binNumber: string) => {
    if (binNumber.length < 6) return

    setIsLoadingBin(true)
    try {
      const response = await fetch('/api/iyzico/bin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ binNumber }),
      })

      const result = await response.json()
      if (result.success) {
        // API response'da data nested değil, direkt result içinde geliyor
        const binData = {
          binNumber: result.binNumber,
          cardType: result.cardType,
          cardAssociation: result.cardAssociation,
          cardFamily: result.cardFamily,
          bankName: result.bankName,
          bankCode: result.bankCode,
          commercial: Boolean(result.commercial)
        }
        setBinInfo(binData)
        // BIN bilgisi alındıktan sonra taksit seçeneklerini getir
        await queryInstallmentOptions(binNumber)
      } else {
        setBinInfo(null)
        setInstallmentOptions([])
      }
    } catch (error) {
      console.error('BIN sorgu hatası:', error)
      setBinInfo(null)
      setInstallmentOptions([])
    } finally {
      setIsLoadingBin(false)
    }
  }

  // Taksit seçeneklerini sorgula
  const queryInstallmentOptions = async (binNumber?: string) => {
    if (orderTotal <= 0) return
    // Bin zorunlu: kart numarası veya kayıtlı kart olmadan taksit sorgulama
    const digits = formData.cardNumber.replace(/\s/g, '')
    const resolvedBin = binNumber || (digits.length >= 6 ? digits.substring(0, 6) : '')
    if (!resolvedBin || resolvedBin.length < 6) {
      setInstallmentOptions([])
      return
    }

    setIsLoadingInstallments(true)
    try {
      const response = await fetch('/api/iyzico/installments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: orderTotal,
          binNumber: resolvedBin,
          currency
        }),
      })

      const result = await response.json()
      if (result.success && result.installmentDetails) {
        const installments: InstallmentOption[] = []

        result.installmentDetails.forEach((detail: any) => {
          if (detail.installmentPrices) {
            detail.installmentPrices.forEach((price: any) => {
              installments.push({
                installmentNumber: price.installmentNumber,
                totalPrice: parseFloat(price.totalPrice),
                installmentPrice: parseFloat(price.installmentPrice),
                bankName: detail.bankName,
                bankCode: detail.bankCode,
                cardFamilyName: detail.cardFamilyName,
                cardType: detail.cardType,
                cardAssociation: detail.cardAssociation,
                commercial: detail.commercial === 1,
                force3ds: detail.force3ds === 1
              })
            })
          }
        })

        // Deduplicate by installmentNumber, prefer lowest totalPrice
        const bestByCount = new Map<number, InstallmentOption>()
        for (const opt of installments) {
          const existing = bestByCount.get(opt.installmentNumber)
          if (!existing || opt.totalPrice < existing.totalPrice) {
            bestByCount.set(opt.installmentNumber, opt)
          }
        }
        const deduped = Array.from(bestByCount.values()).sort((a, b) => a.installmentNumber - b.installmentNumber)
        setInstallmentOptions(deduped)

        // Otomatik olarak ilk taksit seçeneğini seç
        if (installments.length > 0) {
          const defaultInstallment = installments[0].installmentNumber.toString()
          handleInputChange('installment', defaultInstallment)
        } else {
          // No installment options available, set default to 1
          handleInputChange('installment', '1')
        }
      } else {
        setInstallmentOptions([])
        // No installment info available, set default to 1
        handleInputChange('installment', '1')
      }
    } catch (error) {
      console.error('Taksit sorgu hatası:', error)
      setInstallmentOptions([])
      // Error occurred, set default to 1
      handleInputChange('installment', '1')
    } finally {
      setIsLoadingInstallments(false)
    }
  }

  // Re-query installment options when currency or totals change
  useEffect(() => {
    if (orderTotal <= 0) return
    const cardNumberDigits = formData.cardNumber.replace(/\s/g, '')
    const bin = binInfo?.binNumber || (cardNumberDigits.length >= 6 ? cardNumberDigits.substring(0, 6) : undefined)
    if (bin && bin.length === 6) {
      queryInstallmentOptions(bin)
    } else {
      setInstallmentOptions([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, orderTotal, binInfo?.binNumber])

  // Kart numarası değiştiğinde BIN tespiti yap
  useEffect(() => {
    const cardNumber = formData.cardNumber.replace(/\s/g, '')
    if (cardNumber.length >= 6) {
      const binNumber = cardNumber.substring(0, 6)
      queryBinInfo(binNumber)
    } else {
      setBinInfo(null)
      setInstallmentOptions([])
    }
  }, [formData.cardNumber])

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  // Handle input changes
  const handleInputChange = (field: keyof CardFormData, value: string) => {
    let processedValue = value

    // Special formatting for card number
    if (field === 'cardNumber') {
      processedValue = formatCardNumber(value)
    }

    // Remove spaces for validation (card number)
    const valueForValidation = field === 'cardNumber' ? processedValue.replace(/\s/g, '') : processedValue

    setFormData(prev => ({
      ...prev,
      [field]: field === 'cardNumber' ? processedValue : value
    }))

    // Handle installment change notification
    if (field === 'installment' && onInstallmentChange) {
      const selectedInstallmentNumber = parseInt(value)
      const selectedOption = installmentOptions.find(opt => opt.installmentNumber === selectedInstallmentNumber)

      if (selectedOption) {
        onInstallmentChange({
          installmentCount: selectedOption.installmentNumber,
          installmentPrice: selectedOption.installmentPrice,
          totalPrice: selectedOption.totalPrice,
          currency
        })
      } else {
        // Default to single payment if no installment option found
        onInstallmentChange({
          installmentCount: 1,
          installmentPrice: orderTotal,
          totalPrice: orderTotal,
          currency
        })
      }

      // Also dispatch a custom event for cross-component communication
      const installmentData = selectedOption || {
        installmentNumber: 1,
        installmentPrice: orderTotal,
        totalPrice: orderTotal
      }

      const installmentChangeEvent = new CustomEvent('installmentChange', {
        detail: {
          installmentCount: installmentData.installmentNumber,
          installmentPrice: installmentData.installmentPrice,
          totalPrice: installmentData.totalPrice,
          currency
        }
      })
      window.dispatchEvent(installmentChangeEvent)
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }

    // Real-time validation for specific fields
    try {
      const fieldSchema = cardSchema.shape[field]
      if (field === 'cardNumber') {
        fieldSchema.parse(valueForValidation)
      } else {
        fieldSchema.parse(value)
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({
          ...prev,
          [field]: error.errors[0]?.message
        }))
      }
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    try {
      const dataToValidate = {
        ...formData,
        cardNumber: formData.cardNumber.replace(/\s/g, '') // Remove spaces for validation
      }
      cardSchema.parse(dataToValidate)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof CardFormData, string>> = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof CardFormData] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  // Handle payment submission
  const handlePayment = async () => {
    try {
      setIsLoading(true)
      setErrors({})
      setPaymentStatus('idle')
      setPaymentMessage('')

      // Kayıtlı kart ile ödeme
      if (selectedSavedCard) {
        return await handleSavedCardPayment()
      }

      // Validate form data
      if (!validateForm()) {
        toast.error('Lütfen form bilgilerini kontrol ediniz')
        return
      }

      console.log('Starting direct payment process for orderId:', orderId)

      const paymentData = {
        orderId,
        cardNumber: formData.cardNumber.replace(/\s/g, ''), // Remove spaces
        expireMonth: formData.expireMonth,
        expireYear: formData.expireYear,
        cvc: formData.cvc,
        cardHolderName: formData.cardHolderName,
        installment: parseInt(formData.installment),
        currency,
        // Seçilen taksit toplamını ilet
        installmentTotalPrice: (() => {
          const selectedInstallmentNumber = parseInt(formData.installment)
          const selectedOption = installmentOptions.find(opt => opt.installmentNumber === selectedInstallmentNumber)
          return selectedOption ? selectedOption.totalPrice : orderTotal
        })(),
        installmentCurrency: currency,
        // Add saveCard parameter for both 3DS and direct payments
        saveCard,
        // Add cart items and shipping address for 3DS payments
        ...(use3DSecure && {
          cartItems: orderItems?.map(item => ({
            id: item.product.id,
            name: item.product.name,
            category: item.product.category?.name || 'General',
            price: item.price,
            quantity: item.quantity
          })) || [],
          shippingAddress: shippingAddress || {
            fullName: '',
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
          },
          billingAddress: shippingAddress || {
            fullName: '',
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
          },
          buyerEmail: userEmail
        })
      }

      // Choose API endpoint based on 3D Secure preference
      const apiEndpoint = use3DSecure ? '/api/iyzico/3ds-payment' : '/api/iyzico/direct-payment'

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      })

      console.log('API Response status:', response.status)
      const result = await response.json()
      console.log('API Response data:', result)

      if (result.success) {
        if (use3DSecure && result.threeDSHtmlContent) {
          // Decode base64 HTML content
          let decodedHtml = result.threeDSHtmlContent
          try {
            // Check if content is base64 encoded
            if (result.threeDSHtmlContent.match(/^[A-Za-z0-9+/]+=*$/)) {
              decodedHtml = atob(result.threeDSHtmlContent)
            }
          } catch (error) {
            console.log('Content is not base64, using as is')
          }

          // Redirect to 3D Secure page directly
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
          // Direct payment success
          setPaymentStatus('success')
          setPaymentMessage('Ödeme başarıyla tamamlandı!')
          toast.success('Ödeme başarıyla tamamlandı!')

          // Save card if requested
          if (saveCard) {
            try {
              const saveCardResponse = await fetch('/api/iyzico/save-card', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  cardNumber: formData.cardNumber.replace(/\s/g, ''),
                  expireMonth: formData.expireMonth,
                  expireYear: formData.expireYear,
                  cvc: formData.cvc,
                  cardHolderName: formData.cardHolderName,
                  cardAlias: `${formData.cardHolderName} - **** ${formData.cardNumber.slice(-4)}`
                }),
              })

              const saveCardResult = await saveCardResponse.json()
              if (saveCardResult.success) {
                toast.success('Kart başarıyla kaydedildi!')
              } else {
                console.error('Card save error:', saveCardResult.error)
                toast.error('Kart kaydedilemedi, ancak ödeme başarılı.')
              }
            } catch (error) {
              console.error('Card save error:', error)
              toast.error('Kart kaydedilemedi, ancak ödeme başarılı.')
            }
          }

          // Clear cart for direct payments
          const { useCart } = await import('@/store/use-cart')
          useCart.getState().clearCart()

          // Redirect to success page after 2 seconds
          setTimeout(() => {
            window.location.href = `/payment/success?orderId=${orderId}`
          }, 2000)
        }
      } else {
        setPaymentStatus('error')
        setPaymentMessage(result.error || 'Ödeme işlemi başarısız oldu.')

        // Show specific field errors if available
        if (result.details) {
          const fieldErrors: Record<string, string> = {}
          result.details.forEach((error: any) => {
            if (error.path && error.path[0]) {
              fieldErrors[error.path[0]] = error.message
            }
          })
          setErrors(fieldErrors)
        }

        toast.error(result.error || 'Ödeme işlemi başarısız oldu.')
      }
    } catch (error) {
      console.error('Payment error:', error)
      setPaymentStatus('error')
      setPaymentMessage('Bir hata oluştu. Lütfen tekrar deneyin.')
      toast.error(error instanceof Error ? error.message : 'Ödeme sırasında bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  // Generate year options (current year + 20 years) - 2 digit format
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 21 }, (_, i) => {
    const year = currentYear + i
    return {
      value: (year % 100).toString().padStart(2, '0'), // 2 digit format (YY)
      label: year.toString() // Display full year for clarity
    }
  })

  // Generate month options
  const monthOptions = [
    { value: '01', label: '01 - Ocak' },
    { value: '02', label: '02 - Şubat' },
    { value: '03', label: '03 - Mart' },
    { value: '04', label: '04 - Nisan' },
    { value: '05', label: '05 - Mayıs' },
    { value: '06', label: '06 - Haziran' },
    { value: '07', label: '07 - Temmuz' },
    { value: '08', label: '08 - Ağustos' },
    { value: '09', label: '09 - Eylül' },
    { value: '10', label: '10 - Ekim' },
    { value: '11', label: '11 - Kasım' },
    { value: '12', label: '12 - Aralık' }
  ]

  // Fallback installment options (when no dynamic options available)
  const fallbackInstallmentOptions = [
    // Kart bilgileri girilmeden veya kayıtlı kart seçilmeden önce yalnızca tek çekim
    { value: '1', label: 'Tek Çekim' }
  ]

  return (
    <div className="space-y-6">
      {/* Payment Status Messages */}
      {paymentStatus === 'success' && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-success-600 mr-2" />
            <p className="text-success-800 font-medium">{paymentMessage}</p>
          </div>
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-danger-600 mr-2" />
            <p className="text-danger-800 font-medium">{paymentMessage}</p>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-primary-50 dark:bg-primary-950 p-4 rounded-lg border border-primary-200 dark:border-primary-800">
        <div className="flex items-center space-x-2">
          <Lock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="font-semibold text-primary-900 dark:text-primary-100">
            {t('security.title')}
          </h3>
        </div>
        <p className="text-sm text-primary-700 dark:text-primary-300 mt-2">
          {t('security.securePaymentDescription')}
        </p>
      </div>

      {/* Payment Form */}
      <Card className="shadow-lg border border-border bg-background">
        <CardHeader className="bg-muted">
          <CardTitle className="flex items-center space-x-2 text-foreground">
            <CreditCard className="h-5 w-5" />
            <span>{t('cardDetails.cardInformation')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {/* Kayıtlı Kartlar Bölümü */}
          {savedCards.length > 0 && (
            <div className="space-y-4 p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 rounded-lg border border-primary-200 dark:border-primary-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-100 flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>{t('savedCards.mySavedCards')}</span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSavedCards(!showSavedCards)}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  {showSavedCards ? t('savedCards.hide') : t('savedCards.show')}
                </Button>
              </div>

              {showSavedCards && (
                <>
                  {isLoadingSavedCards ? (
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('savedCards.loading')}</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 mb-4 p-3 bg-background rounded-lg border-2 border-dashed border-border">
                        <input
                          type="radio"
                          id="new-card"
                          name="card-selection"
                          checked={!selectedSavedCard}
                          onChange={() => handleSavedCardSelection('')}
                          className="w-4 h-4 text-primary-600"
                        />
                        <Label htmlFor="new-card" className="text-sm font-medium cursor-pointer">
                          {t('savedCards.useNewCard')}
                        </Label>
                      </div>

                      {savedCards.map((card) => (
                        <div key={card.id} className={`flex items-center justify-between p-4 bg-background rounded-lg border-2 transition-all duration-200 ${selectedSavedCard === card.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-border hover:border-border'
                          }`}>
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              id={`card-${card.id}`}
                              name="card-selection"
                              checked={selectedSavedCard === card.id}
                              onChange={() => handleSavedCardSelection(card.id)}
                              className="w-4 h-4 text-primary-600"
                            />
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-6 bg-gradient-to-r from-gray-400 to-gray-600 rounded flex items-center justify-center">
                                <CreditCard className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <Label htmlFor={`card-${card.id}`} className="text-sm font-semibold cursor-pointer">
                                  **** **** **** {card.lastFourDigits}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {card.cardAlias} • {card.cardAssociation} • {card.cardFamily}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSavedCard(card.id)}
                            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                          >
                            {t('savedCards.delete')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Kart Bilgileri Formu - Sadece yeni kart seçildiğinde göster */}
          {!selectedSavedCard && (
            <>
              {/* Card Number */}
              <div className="space-y-2">
                <Label htmlFor="cardNumber">{t('cardDetails.cardNumber')}</Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={formData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                  maxLength={19} // 16 digits + 3 spaces
                  className={errors.cardNumber ? 'border-danger-500' : ''}
                  disabled={isLoading || paymentStatus === 'success'}
                />
                {errors.cardNumber && (
                  <p className="text-sm text-danger-500">{errors.cardNumber}</p>
                )}

                {/* BIN Bilgisi */}
                {isLoadingBin && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('cardDetails.queryingCardInfo')}</span>
                  </div>
                )}
              </div>

              {/* Card Holder Name */}
              <div className="space-y-2">
                <Label htmlFor="cardHolderName">{t('cardDetails.cardHolderName')}</Label>
                <Input
                  id="cardHolderName"
                  type="text"
                  placeholder="JOHN DOE"
                  value={formData.cardHolderName}
                  onChange={(e) => handleInputChange('cardHolderName', e.target.value.toUpperCase())}
                  className={errors.cardHolderName ? 'border-danger-500' : ''}
                  disabled={isLoading || paymentStatus === 'success'}
                />
                {errors.cardHolderName && (
                  <p className="text-sm text-danger-500">{errors.cardHolderName}</p>
                )}
              </div>

              {/* Expiry Date and CVC */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expireMonth">{t('cardDetails.month')}</Label>
                  <Select
                    value={formData.expireMonth}
                    onValueChange={(value) => handleInputChange('expireMonth', value)}
                  >
                    <SelectTrigger className={errors.expireMonth ? 'border-danger-500' : ''} disabled={isLoading || paymentStatus === 'success'}>
                      <SelectValue placeholder="Ay" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.expireMonth && (
                    <p className="text-sm text-danger-500">{errors.expireMonth}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expireYear">{t('cardDetails.year')}</Label>
                  <Select
                    value={formData.expireYear}
                    onValueChange={(value) => handleInputChange('expireYear', value)}
                  >
                    <SelectTrigger className={errors.expireYear ? 'border-danger-500' : ''} disabled={isLoading || paymentStatus === 'success'}>
                      <SelectValue placeholder="Yıl seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((yearOption) => (
                        <SelectItem key={yearOption.value} value={yearOption.value}>
                          {yearOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.expireYear && (
                    <p className="text-sm text-danger-500">{errors.expireYear}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC *</Label>
                  <Input
                    id="cvc"
                    type="text"
                    placeholder="123"
                    value={formData.cvc}
                    onChange={(e) => handleInputChange('cvc', e.target.value)}
                    maxLength={4}
                    className={errors.cvc ? 'border-red-500' : ''}
                    disabled={isLoading || paymentStatus === 'success'}
                  />
                  {errors.cvc && (
                    <p className="text-sm text-red-500">{errors.cvc}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Installment Options */}
          <div className="space-y-2">
            <Label htmlFor="installment">{t('installments.installmentOption')}</Label>

            {isLoadingInstallments && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('installments.loadingOptions')}</span>
              </div>
            )}

            {installmentOptions.length > 0 ? (
              <Select
                value={formData.installment}
                onValueChange={(value) => handleInputChange('installment', value)}
              >
                <SelectTrigger disabled={isLoading || paymentStatus === 'success'}>
                  <SelectValue placeholder={t('installments.selectInstallment')}>
                    {formData.installment && installmentOptions.length > 0 && (() => {
                      const selectedOption = installmentOptions.find(
                        option => option.installmentNumber.toString() === formData.installment
                      );
                      if (selectedOption) {
                        return (
                          <div className="flex items-center justify-between w-full">
                            <span>
                              {selectedOption.installmentNumber === 1
                                ? t('installments.singlePayment')
                                : `${selectedOption.installmentNumber} ${t('installments.installment')}`
                              }
                            </span>
                            <span className="font-semibold text-green-600 ml-2">
                              {fmt(selectedOption.totalPrice)}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {installmentOptions.map((option) => (
                    <SelectItem key={`inst-${option.installmentNumber}`} value={option.installmentNumber.toString()}>
                      <div className="flex items-center justify-between w-full min-w-[250px]">
                        <span className="font-medium">
                          {option.installmentNumber === 1
                            ? t('installments.singlePayment')
                            : `${option.installmentNumber} ${t('installments.installment')}`
                          }
                        </span>
                        <div className="text-right ml-4 flex-shrink-0">
                          <div className="font-semibold text-green-600">
                            {fmt(option.totalPrice)}
                          </div>
                          {option.installmentNumber > 1 && (
                            <div className="text-xs text-muted-foreground">
                              {option.installmentNumber} x {fmt(option.installmentPrice)}
                            </div>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={formData.installment}
                onValueChange={(value) => handleInputChange('installment', value)}
              >
                {/* Kart/BIN bilgisi yoksa seçim kapalı ve liste gösterilmez */}
                <SelectTrigger disabled={true}>
                  <SelectValue placeholder={t('installments.selectInstallment')} />
                </SelectTrigger>
                {/* Seçenek içeriği kaldırıldı: hiçbir bilgi girilmeden taksit listelenmez */}
              </Select>
            )}

            {/* Taksit Bilgi Notu */}
            {installmentOptions.length > 0 && (
              <div className="space-y-4">
                {/* Security Information */}
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t('security.securePayment')}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t('security.securePaymentDescription')}
                  </p>
                </div>

                {/* Card Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('cardDetails.title')}</h3>
                  {binInfo && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full">
                          <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          {t('binInfo.cardInformation')}
                        </span>
                        {binInfo.commercial && (
                          <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs font-medium rounded-full">
                            {t('binInfo.commercialCard')}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center space-x-3 p-2 bg-white dark:bg-gray-800 rounded-md">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <span className="text-xs text-muted-foreground block">{t('binInfo.bank')}</span>
                            <span className="font-semibold text-sm">{binInfo.bankName}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-2 bg-white dark:bg-gray-800 rounded-md">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <span className="text-xs text-muted-foreground block">{t('binInfo.cardFamily')}</span>
                            <span className="font-semibold text-sm">{binInfo.cardFamily}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-2 bg-white dark:bg-gray-800 rounded-md">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <div>
                            <span className="text-xs text-muted-foreground block">{t('binInfo.cardType')}</span>
                            <span className="font-semibold text-sm">
                              {binInfo.cardType === 'CREDIT_CARD' ? t('binInfo.creditCard') :
                                binInfo.cardType === 'DEBIT_CARD' ? t('binInfo.debitCard') :
                                  binInfo.cardType}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-2 bg-white dark:bg-gray-800 rounded-md">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <div>
                            <span className="text-xs text-muted-foreground block">{t('binInfo.cardNetwork')}</span>
                            <span className="font-semibold text-sm">
                              {binInfo.cardAssociation === 'MASTER_CARD' ? t('binInfo.mastercard') :
                                binInfo.cardAssociation === 'VISA' ? t('binInfo.visa') :
                                  binInfo.cardAssociation === 'AMERICAN_EXPRESS' ? t('binInfo.americanExpress') :
                                    binInfo.cardAssociation === 'TROY' ? t('binInfo.troy') :
                                      binInfo.cardAssociation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Taksit Seçenekleri Bilgisi */}
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800 mt-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">
                        {t('installments.installmentOptionsAvailable')}
                      </span>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {t('installments.installmentOptionsDescription', {
                        bankName: binInfo?.bankName ?? '',
                        optionsCount: installmentOptions.length
                      })}
                    </p>
                  </div>
                </div>

                {/* Detaylı Taksit Tablosu */}
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    {t('installments.installmentDetails')}
                  </h4>

                  {/* Taksit Tablosu */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400">{t('installments.installment')}</th>
                          <th className="text-right py-2 text-gray-600 dark:text-gray-400">{t('installments.monthlyPayment')}</th>
                          <th className="text-right py-2 text-gray-600 dark:text-gray-400">{t('installments.totalAmount')}</th>
                          <th className="text-right py-2 text-gray-600 dark:text-gray-400">{t('installments.difference')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installmentOptions.map((option) => {
                          const difference = option.totalPrice - convert(orderTotal)
                          const isSelected = formData.installment === option.installmentNumber.toString()

                          return (
                            <tr
                              key={`row-inst-${option.installmentNumber}`}
                              className={`border-b border-gray-100 dark:border-gray-800 ${isSelected ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                              <td className="py-2">
                                <div className="flex items-center">
                                  {isSelected && <CheckCircle className="h-3 w-3 text-blue-600 mr-1" />}
                                  <span className={isSelected ? 'font-medium text-blue-900 dark:text-blue-100' : ''}>
                                    {option.installmentNumber === 1 ? t('installments.singlePayment') : t('installments.installmentCount', { count: option.installmentNumber })}
                                  </span>
                                </div>
                              </td>
                              <td className="text-right py-2">
                                <span className={isSelected ? 'font-medium text-blue-900 dark:text-blue-100' : ''}>
                                  {fmt(option.installmentPrice)}
                                </span>
                              </td>
                              <td className="text-right py-2">
                                <span className={isSelected ? 'font-medium text-blue-900 dark:text-blue-100' : ''}>
                                  {fmt(option.totalPrice)}
                                </span>
                              </td>
                              <td className="text-right py-2">
                                <span className={`${difference > 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-green-600 dark:text-green-400'
                                  } ${isSelected ? 'font-medium' : ''}`}>
                                  {difference > 0 ? '+' : ''}{fmt(difference)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {t('installments.disclaimer')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Options */}
          <div className="space-y-4">
            {/* 3D Secure Option */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use3DSecure"
                  checked={use3DSecure}
                  onCheckedChange={(checked) => setUse3DSecure(checked as boolean)}
                  disabled={isLoading || paymentStatus === 'success'}
                />
                <Label
                  htmlFor="use3DSecure"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center space-x-2"
                >
                  <Shield className="h-4 w-4 text-green-600" />
                  <span>{t('security.secure3DPayment')}</span>
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                {use3DSecure
                  ? t('security.secure3DDescription')
                  : t('security.fastPaymentDescription')
                }
              </p>
            </div>

            {/* Save Card Option - Sadece yeni kart kullanırken göster */}
            {!selectedSavedCard && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="saveCard"
                    checked={saveCard}
                    onCheckedChange={(checked) => setSaveCard(checked as boolean)}
                    disabled={isLoading || paymentStatus === 'success'}
                  />
                  <Label
                    htmlFor="saveCard"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center space-x-2"
                  >
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span>{t('savedCards.saveCard')}</span>
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  {t('savedCards.saveCardDescription')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supported Cards */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-5 bg-primary-600 rounded text-white text-xs flex items-center justify-center font-bold">
            VISA
          </div>
          <div className="w-8 h-5 bg-danger-600 rounded text-white text-xs flex items-center justify-center font-bold">
            MC
          </div>
          <div className="w-8 h-5 bg-success-600 rounded text-white text-xs flex items-center justify-center font-bold">
            AMEX
          </div>
          <div className="w-8 h-5 bg-warning-600 rounded text-white text-xs flex items-center justify-center font-bold">
            TROY
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            {t('supportedCards.allCardsAccepted')}
          </span>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>• {t('security.secure3DPayment')}</p>
          <p>• {t('security.sslEncryption')}</p>
          <p>• {t('installments.installmentOptionsAvailable')}</p>
          <p>• {t('security.cardInfoNotStored')}</p>
        </div>
      </div>

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={isLoading || paymentStatus === 'success' || isLoadingInstallments}
        className="w-full h-12 text-lg font-semibold"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('processing')}
          </>
        ) : (
          <>
            <Lock className="mr-2 h-5 w-5" />
            {t('buttons.securePayment')}
          </>
        )}
      </Button>

      {/* Terms */}
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