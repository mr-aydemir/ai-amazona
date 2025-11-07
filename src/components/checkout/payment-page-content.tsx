'use client'

import { useState } from 'react'
import { IyzicoCustomPayment } from './iyzico-custom-payment'
import type { Order, OrderItem, Product, Category, SavedCard } from '@prisma/client'
import type { Session } from 'next-auth'

interface PaymentPageContentProps {
  order: Order & {
    items: (OrderItem & {
      product: Product & {
        category: Category
      }
    })[]
  }
  session: Session
  savedCards: SavedCard[]
  termsHtml: string | null
  privacyHtml: string | null
}

export function PaymentPageContent({ order, session, savedCards, termsHtml, privacyHtml }: PaymentPageContentProps) {
  const [selectedInstallment, setSelectedInstallment] = useState<{
    installmentCount: number
    installmentPrice: number
    totalPrice: number
    currency?: string
  } | null>(null)

  return (
    <IyzicoCustomPayment
      orderId={order.id}
      orderItems={order.items.map(item => ({
        ...item,
        product: {
          ...item.product,
          images: item.product.images ?? '',
        },
      }))}
      savedCards={savedCards as any}
      shippingAddress={{
        fullName: order.shippingFullName,
        street: order.shippingStreet,
        city: order.shippingCity,
        state: order.shippingState,
        postalCode: order.shippingPostalCode,
        country: order.shippingCountry,
        phone: order.shippingPhone,
        tcNumber: order.shippingTcNumber ?? ""
      }}
      userEmail={session.user.email || ''}
      onInstallmentChange={setSelectedInstallment}
      termsHtml={termsHtml}
      privacyHtml={privacyHtml}
    />
  )
}