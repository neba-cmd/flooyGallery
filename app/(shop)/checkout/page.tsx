import type { Metadata } from "next"
import { CheckoutView } from "@/components/checkout/checkout-view"

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm your details to generate an order number. Pay at the Flooy Photo Desk.",
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>
}) {
  const { product } = await searchParams
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <CheckoutView productType={product === "team-package" ? "TEAM_PACKAGE" : "PHOTOS"} />
    </main>
  )
}
