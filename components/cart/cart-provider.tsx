"use client"

import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react"
import type { CartItem } from "@/types"

const STORAGE_KEY = "flooy.cart.v1"

type CartContextValue = {
  items: CartItem[]
  count: number
  total: number
  hasItem: (photoId: string) => boolean
  addItem: (item: CartItem) => void
  removeItem: (photoId: string) => void
  toggleItem: (item: CartItem) => void
  clear: () => void
  hydrated: boolean
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Load persisted selection on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw) as CartItem[])
    } catch {
      // ignore malformed storage
    }
    setHydrated(true)
  }, [])

  // Persist on change (after hydration to avoid clobbering).
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // storage may be unavailable (private mode); selection stays in memory
    }
  }, [items, hydrated])

  const hasItem = useCallback((photoId: string) => items.some((i) => i.photoId === photoId), [items])

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => (prev.some((i) => i.photoId === item.photoId) ? prev : [...prev, item]))
  }, [])

  const removeItem = useCallback((photoId: string) => {
    setItems((prev) => prev.filter((i) => i.photoId !== photoId))
  }, [])

  const toggleItem = useCallback((item: CartItem) => {
    setItems((prev) =>
      prev.some((i) => i.photoId === item.photoId)
        ? prev.filter((i) => i.photoId !== item.photoId)
        : [...prev, item],
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.length,
      total: items.reduce((sum, i) => sum + (Number(i.price) || 0), 0),
      hasItem,
      addItem,
      removeItem,
      toggleItem,
      clear,
      hydrated,
    }),
    [items, hasItem, addItem, removeItem, toggleItem, clear, hydrated],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within a CartProvider")
  return ctx
}
