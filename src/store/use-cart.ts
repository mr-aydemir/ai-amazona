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
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      addItem: (item) => {
        set((state) => {
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

          return {
            items: newItems,
            total: newTotal,
          }
        })
      },
      removeItem: (productId) => {
        set((state) => {
          const newItems = state.items.filter((item) => item.productId !== productId)
          const newTotal = newItems.reduce(
            (total, item) => total + item.price * item.quantity,
            0
          )
          return {
            items: newItems,
            total: newTotal,
          }
        })
      },
      updateQuantity: (productId, quantity) => {
        if (quantity < 1) return // Prevent negative quantities

        set((state) => {
          const newItems = state.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          )
          const newTotal = newItems.reduce(
            (total, item) => total + item.price * item.quantity,
            0
          )
          return {
            items: newItems,
            total: newTotal,
          }
        })
      },
      clearCart: () => set({ items: [], total: 0 }),
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
