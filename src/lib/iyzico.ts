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

// İyzico API client using fetch
export class IyzicoClient {
  private config: typeof IYZICO_CONFIG

  constructor(config: typeof IYZICO_CONFIG) {
    this.config = config
  }

  private generateAuthString(randomString: string, requestBody: string): string {
    //const crypto = require('crypto')
    const dataToSign = randomString + this.config.apiKey + requestBody
    const hash = crypto.createHmac('sha1', this.config.secretKey).update(dataToSign, 'utf8').digest('base64')
    return `IYZWS ${this.config.apiKey}:${hash}`
  }

  private generateRandomString(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  async initializeCheckoutForm(request: IyzicoCheckoutFormRequest) {
    const randomString = this.generateRandomString()
    const requestBody = JSON.stringify(request)
    const authorization = this.generateAuthString(randomString, requestBody)

    const response = await fetch(`${this.config.uri}/payment/iyzipos/checkoutform/initialize/auth/ecom`, {
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
    const authorization = this.generateAuthString(randomString, requestBody)

    const response = await fetch(`${this.config.uri}/payment/iyzipos/checkoutform/auth/ecom/detail`, {
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

  return {
    id: user.id,
    name: firstName,
    surname: lastName,
    gsmNumber: '+905350000000', // Default phone number
    email: user.email,
    identityNumber: '74300864791', // Default identity number for testing
    lastLoginDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
    registrationDate: new Date().toISOString().split('T')[0] + ' 12:00:00',
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