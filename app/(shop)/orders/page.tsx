import type { Metadata } from "next"
import { OrderLookup } from "@/components/orders/order-lookup"

export const metadata: Metadata = {
  title: "Find your order",
  description: "Enter your Flooy Photos order number to check its status and download purchases.",
}

export default function OrderLookupPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">Find your order</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the order number and the email address or phone number used at checkout. This protects
        your order details and purchased downloads.
      </p>
      <OrderLookup />
    </main>
  )
}
