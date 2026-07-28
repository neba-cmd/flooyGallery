import { notFound } from "next/navigation"
import { getOrderDetail } from "@/lib/services/admin"
import { formatDateTime, formatPrice } from "@/lib/format"
import { OrderActions } from "@/components/admin/order-actions"
import { SafeImage } from "@/components/safe-image"

export default async function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params
  const order = await getOrderDetail(decodeURIComponent(orderNumber))
  if (!order) notFound()
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">Order</p><h1 className="font-mono text-2xl font-semibold">{order.orderNumber}</h1></div><OrderActions orderId={order.id} status={order.status} /></div>
    <dl className="grid gap-4 rounded-xl border bg-card p-5 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">Customer</dt><dd>{order.customerName}<br/>{order.customerEmail}<br/>{order.customerPhone}</dd></div><div><dt className="text-muted-foreground">Event</dt><dd>{order.eventName ?? "—"}</dd></div><div><dt className="text-muted-foreground">Placed</dt><dd>{formatDateTime(order.createdAt)}</dd><dt className="mt-2 text-muted-foreground">Paid</dt><dd>{order.paidAt ? formatDateTime(order.paidAt) : "Not paid"}</dd></div></dl>
    <div className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Ordered photos</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{order.items?.map(item => <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3"><div className="relative size-16 overflow-hidden rounded-md"><SafeImage src={item.photo.previewUrl || "/placeholder.svg"} alt={item.photo.filename} fill className="object-cover" /></div><div className="min-w-0 flex-1"><p className="truncate">{item.photo.filename}</p><p className="text-xs text-muted-foreground">Photo #{item.photo.photoNumber ?? "—"} · {item.photo.photographer ?? "Unknown"}</p></div><span>{formatPrice(item.unitPrice)}</span></div>)}</div><div className="mt-5 flex justify-end border-t pt-4 text-lg font-semibold">Total: {formatPrice(order.totalAmount)}</div></div>
  </div>
}
