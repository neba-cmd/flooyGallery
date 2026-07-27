import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getOrderByNumber } from "@/lib/services/orders"
import { OrderStatusView } from "@/components/orders/order-status-view"

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
  const order = await getOrderByNumber(decodeURIComponent(orderNumber))

  if (!order) {
    notFound()
  }

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <OrderStatusView order={order} />
    </main>
  )
}
