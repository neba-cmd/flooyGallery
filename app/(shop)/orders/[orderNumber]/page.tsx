import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getOrderByNumber } from "@/lib/services/orders"
import { OrderStatusView } from "@/components/orders/order-status-view"
import { orderAccessCookieName, verifyOrderAccessToken } from "@/lib/order-access"
import { toPublicOrder } from "@/lib/serialize"

export const metadata: Metadata = {
  title: "Order status",
  description: "Track your Flooy Photos order and download your purchased images.",
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>
}) {
  const { orderNumber } = await params
  const normalized = decodeURIComponent(orderNumber).trim().toUpperCase()
  const cookieStore = await cookies()
  const token = cookieStore.get(orderAccessCookieName(normalized))?.value

  if (!verifyOrderAccessToken(normalized, token)) {
    redirect("/orders?error=verification-required")
  }
  const order = await getOrderByNumber(normalized)
  if (!order) redirect("/orders?error=not-found")

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <OrderStatusView order={toPublicOrder(order)} />
    </main>
  )
}
