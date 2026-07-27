import type { Metadata } from "next"
import { CartView } from "@/components/cart/cart-view"

export const metadata: Metadata = {
  title: "Your selection",
  description: "Review the photos you've selected before heading to checkout.",
}

export default function CartPage() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <CartView />
    </main>
  )
}
