import crypto from 'crypto'

// İyzico API configuration and utilities
export const IYZICO_CONFIG = {
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'
}

// İyzico constants
export const IYZICO_CURRENCY = 'TRY'
export const IYZICO_PAYMENT_CHANNEL = 'WEB'
export const IYZICO_PAYMENT_GROUP = 'PRODUCT'
export const IYZICO_BASKET_ITEM_TYPE = 'PHYSICAL'

// İyzico payment statuses
export const IYZICO_PAYMENT_STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  INIT_THREEDS: 'init_threeds',
  CALLBACK_THREEDS: 'callback_threeds'
} as const

// Helper functions
export function formatPrice(price: number): number {
  // İyzico için fiyat formatı: tam sayı kısmı + maksimum 2 ondalık hane
  // Örnek: 123.456 -> 123.46, 123.4 -> 123.40, 123 -> 123.00
  const rounded = Math.round(price * 100) / 100 // 2 ondalık haneye yuvarla
  return Number(rounded.toFixed(2)) // Number olarak döndür
}

export function generateConversationId(): string {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// İyzico API request types
export interface IyzicoBasketItem {
  id: string
  name: string
  category1: string
  category2?: string
  itemType: string
  price: number
}

export interface IyzicoBuyer {
  id: string
  name: string
  surname: string
  gsmNumber?: string
  email: string
  identityNumber: string
  lastLoginDate?: string
  registrationDate?: string
  registrationAddress: string
  ip: string
  city: string
  country: string
  zipCode?: string
}

export interface IyzicoAddress {
  contactName: string
  city: string
  country: string
  address: string
  zipCode?: string
}

export interface IyzicoCheckoutFormRequest {
  locale: string
  conversationId: string
  price: number
  paidPrice: number
  currency: string
  basketId: string
  paymentGroup: string
  callbackUrl: string
  enabledInstallments: number[]
  buyer: IyzicoBuyer
  shippingAddress: IyzicoAddress
  billingAddress: IyzicoAddress
  basketItems: IyzicoBasketItem[]
}

export interface IyzicoPayWithIyzicoRequest {
  locale: string
  conversationId: string
  price: number
  paidPrice: number
  currency: string
  basketId: string
  paymentGroup: string
  callbackUrl: string
  enabledInstallments: number[]
  buyer: IyzicoBuyer
  shippingAddress: IyzicoAddress
  billingAddress: IyzicoAddress
  basketItems: IyzicoBasketItem[]
}

export interface IyzicoPaymentCard {
  cardHolderName: string
  cardNumber: string
  expireMonth: string
  expireYear: string
  cvc: string
}

export interface IyzicoDirectPaymentRequest {
  locale: string
  conversationId: string
  price: number
  paidPrice: number
  currency: string
  basketId: string
  paymentGroup: string
  paymentChannel: string
  installment: number
  paymentCard: IyzicoPaymentCard
  buyer: IyzicoBuyer
  shippingAddress: IyzicoAddress
  billingAddress: IyzicoAddress
  basketItems: IyzicoBasketItem[]
}

export interface Iyzico3DSPaymentRequest {
  locale: string
  conversationId: string
  price: number
  paidPrice: number
  currency: string
  basketId: string
  paymentGroup: string
  paymentChannel: string
  installment: number
  paymentCard: IyzicoPaymentCard
  buyer: IyzicoBuyer
  shippingAddress: IyzicoAddress
  billingAddress: IyzicoAddress
  basketItems: IyzicoBasketItem[]
  callbackUrl: string
}

// İyzico API client using fetch
export class IyzicoClient {
  private config: typeof IYZICO_CONFIG

  constructor(config: typeof IYZICO_CONFIG) {
    this.config = config
  }

  private generateAuthString(randomString: string, requestBody: string, uriPath: string = ''): string {
    // İyzico HMACSHA256 kimlik doğrulama formatına göre
    // payload = randomKey + uriPath + requestBody
    const payload = randomString + uriPath + requestBody
    
    // HMACSHA256 ile şifreleme
    const encryptedData = crypto.createHmac('sha256', this.config.secretKey).update(payload, 'utf8').digest('hex')
    
    // Authorization string oluşturma
    // Format: apiKey:apiKeyValue&randomKey:randomKeyValue&signature:encryptedData
    const authorizationString = `apiKey:${this.config.apiKey}&randomKey:${randomString}&signature:${encryptedData}`
    
    // Base64 encoding
    const base64EncodedAuthorization = Buffer.from(authorizationString, 'utf8').toString('base64')
    
    // Final authorization header: IYZWSv2 base64EncodedAuthorization
    return `IYZWSv2 ${base64EncodedAuthorization}`
  }

  private generateRandomString(): string {
    // İyzico dokümantasyonuna göre randomKey oluşturma
    // Örnek: 1722246017090123456789 (timestamp + random sayılar)
    return new Date().getTime().toString() + Math.random().toString().substring(2, 11)
  }

  async initializeCheckoutForm(request: IyzicoCheckoutFormRequest) {
    const randomString = this.generateRandomString()
    const requestBody = JSON.stringify(request)
    const uriPath = '/payment/iyzipos/checkoutform/initialize/auth/ecom'
    const authorization = this.generateAuthString(randomString, requestBody, uriPath)

    const response = await fetch(`${this.config.uri}${uriPath}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomString,
        'x-iyzi-client-version': 'iyzipay-node-2.0.0'
      },
      body: requestBody
    })

    if (!response.ok) {
      throw new Error(`İyzico API error: ${response.status}`)
    }

    return response.json()
  }

  async initializePayWithIyzico(request: IyzicoPayWithIyzicoRequest) {
    const randomString = this.generateRandomString()
    const requestBody = JSON.stringify(request)
    const uriPath = '/payment/pay-with-iyzico/initialize'
    const authorization = this.generateAuthString(randomString, requestBody, uriPath)

    const response = await fetch(`${this.config.uri}${uriPath}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomString,
        'x-iyzi-client-version': 'iyzipay-node-2.0.0'
      },
      body: requestBody
    })

    if (!response.ok) {
      throw new Error(`İyzico API error: ${response.status}`)
    }

    return response.json()
  }

  async retrieveCheckoutForm(token: string) {
    const randomString = this.generateRandomString()
    const requestBody = JSON.stringify({ token })
    const uriPath = '/payment/iyzipos/checkoutform/auth/ecom/detail'
    const authorization = this.generateAuthString(randomString, requestBody, uriPath)

    const response = await fetch(`${this.config.uri}${uriPath}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomString,
        'x-iyzi-client-version': 'iyzipay-node-2.0.0'
      },
      body: requestBody
    })

    if (!response.ok) {
      throw new Error(`İyzico API error: ${response.status}`)
    }

    return response.json()
  }

  async createDirectPayment(request: IyzicoDirectPaymentRequest) {
    const randomString = this.generateRandomString()
    const requestBody = JSON.stringify(request)
    const uriPath = '/payment/auth'
    const authorization = this.generateAuthString(randomString, requestBody, uriPath)

    const response = await fetch(`${this.config.uri}${uriPath}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomString,
        'x-iyzi-client-version': 'iyzipay-node-2.0.0'
      },
      body: requestBody
    })

    if (!response.ok) {
      throw new Error(`İyzico API error: ${response.status}`)
    }

    return response.json()
  }

  async create3DSPayment(request: Iyzico3DSPaymentRequest) {
    const randomString = this.generateRandomString()
    const requestBody = JSON.stringify(request)
    const uriPath = '/payment/3dsecure/initialize'
    const authorization = this.generateAuthString(randomString, requestBody, uriPath)

    const response = await fetch(`${this.config.uri}${uriPath}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomString,
        'x-iyzi-client-version': 'iyzipay-node-2.0.0'
      },
      body: requestBody
    })

    if (!response.ok) {
      throw new Error(`İyzico API error: ${response.status}`)
    }

    return response.json()
  }

  async retrieve3DSPayment(request: { paymentId: string; conversationId: string }) {
    const randomString = this.generateRandomString()
    const requestBody = JSON.stringify(request)
    const uriPath = '/payment/3dsecure/auth'
    const authorization = this.generateAuthString(randomString, requestBody, uriPath)

    const response = await fetch(`${this.config.uri}${uriPath}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'x-iyzi-rnd': randomString,
        'x-iyzi-client-version': 'iyzipay-node-2.0.0'
      },
      body: requestBody
    })

    if (!response.ok) {
      throw new Error(`İyzico API error: ${response.status}`)
    }

    return response.json()
  }
}

// Create İyzico client instance
export const iyzicoClient = new IyzicoClient(IYZICO_CONFIG)

// Helper functions for creating İyzico objects
export function createBasketItem(product: any): IyzicoBasketItem {
  return {
    id: product.id,
    name: product.name,
    category1: product.category || 'Genel',
    itemType: IYZICO_BASKET_ITEM_TYPE,
    price: formatPrice(product.price * product.quantity)
  }
}

export function createBuyer(user: any, shippingAddress: any): IyzicoBuyer {
  // Güvenli null check - shippingAddress yoksa hata fırlat
  if (!shippingAddress) {
    throw new Error('Shipping address is required for payment processing')
  }

  // Split fullName into firstName and lastName
  const nameParts = shippingAddress.fullName?.split(' ') || ['', '']
  const firstName = nameParts[0] || 'Ad'
  const lastName = nameParts.slice(1).join(' ') || 'Soyad'
  const today = new Date()
  const date = today.toISOString().split('T')[0]
  const time = today.toISOString().split('T')[1].split(".")[0]
  return {
    id: user.id,
    name: firstName,
    surname: lastName,
    gsmNumber: '+905350000000', // Default phone number
    email: user.email,
    identityNumber: '74300864791', // Default identity number for testing
    lastLoginDate: date + ' ' + time,
    registrationDate: date + ' ' + time,
    registrationAddress: shippingAddress.street || 'Default Address',
    ip: '85.34.78.112', // Default IP for testing
    city: shippingAddress.city || 'Default City',
    country: shippingAddress.country || 'Turkey',
    zipCode: shippingAddress.postalCode || '34000',
  }
}

export function createAddress(addressData: any): IyzicoAddress {
  // Güvenli null check - addressData yoksa hata fırlat
  if (!addressData) {
    throw new Error('Address data is required for payment processing')
  }

  // fullName'i firstName ve lastName'e böl
  const nameParts = addressData.fullName?.split(' ') || ['', '']
  const firstName = nameParts[0] || 'Ad'
  const lastName = nameParts.slice(1).join(' ') || 'Soyad'

  return {
    contactName: `${firstName} ${lastName}`,
    city: addressData.city || 'Default City',
    country: addressData.country || 'Turkey',
    address: addressData.street || 'Default Address',
    zipCode: addressData.postalCode || '34000'
  }
}