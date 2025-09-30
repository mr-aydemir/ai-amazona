'use client'

import { useState } from 'react'
import { IyzicoCustomPayment } from './iyzico-custom-payment'
import type { Order, OrderItem, Product, Category } from '@prisma/client'
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
}

export function PaymentPageContent({ order, session }: PaymentPageContentProps) {
  const [selectedInstallment, setSelectedInstallment] = useState<{
    installmentCount: number
    installmentPrice: number
    totalPrice: number
  } | null>(null)

  return (
    <IyzicoCustomPayment
      orderId={order.id}
      orderItems={order.items}
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
    />
  )
}