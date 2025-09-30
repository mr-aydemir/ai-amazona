'use client'

import { useState, useEffect } from 'react'
import { OrderSummary } from './order-summary'
import type { OrderItem, Product, Category } from '@prisma/client'

interface OrderSummaryContainerProps {
  orderItems: (OrderItem & {
    product: Product & {
      category: Category
    }
  })[]
  orderTotal: number
}

export function OrderSummaryContainer({ orderItems, orderTotal }: OrderSummaryContainerProps) {
  const [selectedInstallment, setSelectedInstallment] = useState<{
    installmentCount: number
    installmentPrice: number
    totalPrice: number
  } | null>(null)

  // Listen for installment changes from the payment component
  useEffect(() => {
    const handleInstallmentChange = (event: CustomEvent) => {
      setSelectedInstallment(event.detail)
    }

    window.addEventListener('installmentChange', handleInstallmentChange as EventListener)

    return () => {
      window.removeEventListener('installmentChange', handleInstallmentChange as EventListener)
    }
  }, [])

  return (
    <OrderSummary
      orderItems={orderItems}
      orderTotal={orderTotal}
      selectedInstallment={selectedInstallment as any}
    />
  )
}