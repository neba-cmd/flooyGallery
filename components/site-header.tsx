"use client"

import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import { useCart } from "@/components/cart/cart-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function SiteHeader() {
  const { count, hydrated } = useCart()

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            F
          </span>
          <span className="text-lg font-semibold tracking-tight">Flooy Photos</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/" />} className="hidden sm:inline-flex">
            Gallery
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/orders" />}>
            My Order
          </Button>
          <Button size="sm" className="relative gap-2" render={<Link href="/cart" />}>
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {hydrated && count > 0 && (
              <Badge
                variant="secondary"
                className="ml-0.5 h-5 min-w-5 justify-center rounded-full px-1.5 text-xs tabular-nums"
              >
                {count}
              </Badge>
            )}
          </Button>
        </nav>
      </div>
    </header>
  )
}
