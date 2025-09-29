'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, CreditCard, Lock, CheckCircle, XCircle, Shield } from 'lucide-react'
import { z } from 'zod'

interface IyzicoCustomPaymentProps {
  orderId: string
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
    email: string
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}

// Zod validation schema for card details
const cardSchema = z.object({
  cardNumber: z.string()
    .min(15, 'Kart numarası en az 15 haneli olmalıdır')
    .max(16, 'Kart numarası en fazla 16 haneli olmalıdır')
    .regex(/^\d+$/, 'Kart numarası sadece rakam içermelidir'),
  expireMonth: z.string()
    .min(2, 'Ay 2 haneli olmalıdır')
    .max(2, 'Ay 2 haneli olmalıdır')
    .regex(/^(0[1-9]|1[0-2])$/, 'Geçerli bir ay giriniz (01-12)'),
  expireYear: z.string()
    .length(2, 'Yıl 2 haneli olmalıdır (YY)')
    .regex(/^\d{2}$/, 'Geçerli bir yıl giriniz (örn: 25)')
    .refine((val) => {
      const year = parseInt(val)
      const currentYear = new Date().getFullYear() % 100
      return year >= currentYear && year <= currentYear + 20
    }, 'Geçerli bir son kullanma yılı giriniz'),
  cvc: z.string()
    .min(3, 'CVC en az 3 haneli olmalıdır')
    .max(4, 'CVC en fazla 4 haneli olmalıdır')
    .regex(/^\d+$/, 'CVC sadece rakam içermelidir'),
  cardHolderName: z.string()
    .min(2, 'Kart sahibi adı en az 2 karakter olmalıdır')
    .max(50, 'Kart sahibi adı en fazla 50 karakter olmalıdır')
    .regex(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/, 'Kart sahibi adı sadece harf içermelidir'),
  installment: z.string().default('1')
})

type CardFormData = z.infer<typeof cardSchema>

export function IyzicoCustomPayment({ orderId, orderItems, shippingAddress }: IyzicoCustomPaymentProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [use3DSecure, setUse3DSecure] = useState(false)
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

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
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
            email: '',
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
          },
          billingAddress: shippingAddress || {
            fullName: '',
            email: '',
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
          }
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

  // Installment options
  const installmentOptions = [
    { value: '1', label: 'Tek Çekim' },
    { value: '2', label: '2 Taksit' },
    { value: '3', label: '3 Taksit' },
    { value: '6', label: '6 Taksit' },
    { value: '9', label: '9 Taksit' },
    { value: '12', label: '12 Taksit' }
  ]

  return (
    <div className="space-y-6">
      {/* Payment Status Messages */}
      {paymentStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-800 font-medium">{paymentMessage}</p>
          </div>
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800 font-medium">{paymentMessage}</p>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center space-x-2">
          <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Güvenli Ödeme
          </h3>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
          Ödemeniz İyzico güvenli ödeme sistemi ile korunmaktadır.
          Kredi kartı bilgileriniz şifrelenerek işlenir ve saklanmaz.
        </p>
      </div>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Kart Bilgileri</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Kart Numarası *</Label>
            <Input
              id="cardNumber"
              type="text"
              placeholder="1234 5678 9012 3456"
              value={formData.cardNumber}
              onChange={(e) => handleInputChange('cardNumber', e.target.value)}
              maxLength={19} // 16 digits + 3 spaces
              className={errors.cardNumber ? 'border-red-500' : ''}
              disabled={isLoading || paymentStatus === 'success'}
            />
            {errors.cardNumber && (
              <p className="text-sm text-red-500">{errors.cardNumber}</p>
            )}
          </div>

          {/* Card Holder Name */}
          <div className="space-y-2">
            <Label htmlFor="cardHolderName">Kart Sahibinin Adı *</Label>
            <Input
              id="cardHolderName"
              type="text"
              placeholder="JOHN DOE"
              value={formData.cardHolderName}
              onChange={(e) => handleInputChange('cardHolderName', e.target.value.toUpperCase())}
              className={errors.cardHolderName ? 'border-red-500' : ''}
              disabled={isLoading || paymentStatus === 'success'}
            />
            {errors.cardHolderName && (
              <p className="text-sm text-red-500">{errors.cardHolderName}</p>
            )}
          </div>

          {/* Expiry Date and CVC */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expireMonth">Ay *</Label>
              <Select
                value={formData.expireMonth}
                onValueChange={(value) => handleInputChange('expireMonth', value)}
              >
                <SelectTrigger className={errors.expireMonth ? 'border-red-500' : ''} disabled={isLoading || paymentStatus === 'success'}>
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
                <p className="text-sm text-red-500">{errors.expireMonth}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expireYear">Yıl (YY) *</Label>
              <Select
                value={formData.expireYear}
                onValueChange={(value) => handleInputChange('expireYear', value)}
              >
                <SelectTrigger className={errors.expireYear ? 'border-red-500' : ''} disabled={isLoading || paymentStatus === 'success'}>
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
                <p className="text-sm text-red-500">{errors.expireYear}</p>
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

          {/* Installment Options */}
          <div className="space-y-2">
            <Label htmlFor="installment">Taksit Seçeneği</Label>
            <Select
              value={formData.installment}
              onValueChange={(value) => handleInputChange('installment', value)}
            >
              <SelectTrigger disabled={isLoading || paymentStatus === 'success'}>
                <SelectValue placeholder="Taksit seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {installmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3D Secure Option */}
          <div className="space-y-3">
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
                <span>3D Secure ile güvenli ödeme</span>
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              {use3DSecure 
                ? "Ödemeniz bankanızın 3D Secure sayfasında onaylanacak. Daha güvenli ancak biraz daha uzun sürer."
                : "Hızlı ödeme seçeneği. Kart bilgileriniz güvenli şekilde işlenir."
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Supported Cards */}
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
          <div className="w-8 h-5 bg-orange-600 rounded text-white text-xs flex items-center justify-center font-bold">
            TROY
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            Tüm kredi kartları kabul edilir
          </span>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>• 3D Secure ile güvenli ödeme</p>
          <p>• SSL sertifikası ile şifrelenmiş bağlantı</p>
          <p>• Taksit seçenekleri mevcut</p>
          <p>• Kart bilgileriniz saklanmaz</p>
        </div>
      </div>

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={isLoading || paymentStatus === 'success'}
        className="w-full h-12 text-lg font-semibold"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Ödeme İşleniyor...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-5 w-5" />
            Güvenli Ödeme Yap
          </>
        )}
      </Button>

      {/* Terms */}
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