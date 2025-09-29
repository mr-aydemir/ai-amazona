'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useCart } from '@/store/use-cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)
  const { data: session, status } = useSession()
  const cart = useCart()

  useEffect(() => {
    // This will hydrate the cart with the persisted data from localStorage
    const savedCart = localStorage.getItem('shopping-cart')
    if (savedCart) {
      try {
        const { state } = JSON.parse(savedCart)
        if (state && state.items) {
          useCart.setState({ items: state.items })
        }
      } catch (error) {
        console.error('Error hydrating cart:', error)
      }
    }
    setIsHydrated(true)
  }, [])

  // Sync authentication status and cart with database
  useEffect(() => {
    if (status === 'loading' || !isHydrated) return

    const isAuthenticated = !!session?.user
    cart.setAuthenticated(isAuthenticated)

    // Sync cart with database when user logs in
    if (isAuthenticated) {
      cart.syncWithDatabase()
    }
  }, [session, status, isHydrated]) // Removed 'cart' from dependencies

  if (!isHydrated) {
    return null // Prevent flash of incorrect content
  }

  return <>{children}</>
}
