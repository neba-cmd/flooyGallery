import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { PaymentCompleteView } from "@/components/checkout/payment-complete-view"
import { verifyOrderAccessToken } from "@/lib/order-access"

export const metadata: Metadata = { title: "Checking payment" }

export default async function PaymentCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; access?: string }>
}) {
  const query = await searchParams
  const orderNumber = query.order?.trim().toUpperCase()
  if (!orderNumber || !verifyOrderAccessToken(orderNumber, query.access)) {
    redirect("/orders?error=verification-required")
  }
  return (
    <main className="mx-auto flex min-h-[65vh] w-full max-w-xl items-center px-4 py-12 sm:px-6">
      <PaymentCompleteView orderNumber={orderNumber} accessToken={query.access!} />
    </main>
  )
}
