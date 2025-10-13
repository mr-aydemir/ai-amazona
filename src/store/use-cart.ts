import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type CartItem = {
  id: string
  productId: string
  name: string
  price: number
  image: string
  quantity: number
}

type CartStore = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  total: number
  syncWithDatabase: () => Promise<void>
  isAuthenticated: boolean
  setAuthenticated: (authenticated: boolean) => void
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      isAuthenticated: false,
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      syncWithDatabase: async () => {
        const state = get()
        if (!state.isAuthenticated) return

        try {
          // Fetch cart from database
          const response = await fetch('/api/cart')
          if (response.ok) {
            const { cart } = await response.json()
            if (cart && cart.items) {
              // Transform database cart items to match frontend format
              const items = cart.items.map((item: any) => {
                // Parse images from JSON string if needed
                const images = item.product.images

                // Handle different image data formats
                let imageUrl = '/images/placeholder.svg'

                if (typeof images === 'string') {
                  // Check if string is empty or just whitespace
                  if (!images.trim()) {
                    imageUrl = '/images/placeholder.svg'
                  } else {
                    try {
                      // Only try to parse if it looks like valid JSON
                      if (images.startsWith('[') && images.endsWith(']')) {
                        const parsedImages = JSON.parse(images)
                        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                          const firstImage = parsedImages[0]
                          if (typeof firstImage === 'string' && firstImage.trim() &&
                            (firstImage.startsWith('/') || firstImage.startsWith('http'))) {
                            imageUrl = firstImage
                          }
                        }
                      } else if (images.startsWith('"') && images.endsWith('"')) {
                        // Handle single quoted string
                        const unquotedImage = images.slice(1, -1)
                        if (unquotedImage.trim() &&
                          (unquotedImage.startsWith('/') || unquotedImage.startsWith('http'))) {
                          imageUrl = unquotedImage
                        }
                      } else if (images.startsWith('/') || images.startsWith('http')) {
                        // Treat as single image URL
                        imageUrl = images
                      }
                    } catch (e) {
                      console.error('Failed to parse images JSON:', images, e)
                      // If parsing fails, check if it looks like a URL
                      if (images.includes('http') || (images.startsWith('/') && !images.startsWith('[') && !images.startsWith('{'))) {
                        imageUrl = images
                      }
                    }
                  }
                } else if (Array.isArray(images) && images.length > 0) {
                  // Handle case where images is already an array
                  const firstImage = images[0]
                  if (typeof firstImage === 'string' && firstImage.trim() &&
                    (firstImage.startsWith('/') || firstImage.startsWith('http'))) {
                    imageUrl = firstImage
                  }
                }
                return {
                  id: `cart_${item.productId}_${item.id}`,
                  productId: item.productId,
                  name: item.product.name,
                  price: item.product.price,
                  image: imageUrl,
                  quantity: item.quantity
                }
              })

              const total = items.reduce(
                (sum: number, item: CartItem) => sum + item.price * item.quantity,
                0
              )
              set({ items, total })
            }
          }
        } catch (error) {
          console.error('Failed to sync cart with database:', error)
        }
      },
      addItem: async (item) => {
        const state = get()

        // Update local state first
        const existingItem = state.items.find(
          (i) => i.productId === item.productId
        )

        let newItems
        if (existingItem) {
          newItems = state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          )
        } else {
          newItems = [
            ...state.items,
            { ...item, id: `cart_${item.productId}_${Date.now()}` },
          ]
        }

        const newTotal = newItems.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )

        set({
          items: newItems,
          total: newTotal,
        })

        // Sync with database if authenticated
        if (state.isAuthenticated) {
          try {
            await fetch('/api/cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: item.productId,
                quantity: item.quantity
              })
            })
          } catch (error) {
            console.error('Failed to sync add item with database:', error)
          }
        }
      },
      removeItem: async (productId) => {
        const state = get()

        // Update local state first
        const newItems = state.items.filter((item) => item.productId !== productId)
        const newTotal = newItems.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )

        set({
          items: newItems,
          total: newTotal,
        })

        // Sync with database if authenticated
        if (state.isAuthenticated) {
          try {
            await fetch('/api/cart', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId,
                quantity: 0
              })
            })
          } catch (error) {
            console.error('Failed to sync remove item with database:', error)
          }
        }
      },
      updateQuantity: async (productId, quantity) => {
        if (quantity < 1) return // Prevent negative quantities

        const state = get()

        // Update local state first
        const newItems = state.items.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        )
        const newTotal = newItems.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )

        set({
          items: newItems,
          total: newTotal,
        })

        // Sync with database if authenticated
        if (state.isAuthenticated) {
          try {
            await fetch('/api/cart', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId,
                quantity
              })
            })
          } catch (error) {
            console.error('Failed to sync update quantity with database:', error)
          }
        }
      },
      clearCart: async () => {
        const state = get()

        // Update local state first
        set({ items: [], total: 0 })

        // Sync with database if authenticated
        if (state.isAuthenticated) {
          try {
            await fetch('/api/cart', {
              method: 'DELETE'
            })
          } catch (error) {
            console.error('Failed to sync clear cart with database:', error)
          }
        }
      },
      getTotal: () => {
        const state = get()
        return state.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )
      },
    }),
    {
      name: 'shopping-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
