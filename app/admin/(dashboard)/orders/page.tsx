import Link from "next/link"
import { listOrders } from "@/lib/services/admin"
import { listAllEvents } from "@/lib/services/events"
import { formatDateTime, formatPrice } from "@/lib/format"
import type { OrderStatus } from "@/types"
import { OrderActions } from "@/components/admin/order-actions"

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams
  const status = ["PENDING_PAYMENT", "PAID", "COMPLETED", "CANCELLED"].includes(params.status ?? "") ? params.status as OrderStatus : undefined
  const page = Math.max(1, Number(params.page) || 1)
  const [result, events] = await Promise.all([listOrders({ search: params.q, status, eventId: params.event, page }), listAllEvents()])
  const pageUrl = (nextPage: number) => {
    const query = new URLSearchParams()
    if (params.q) query.set("q", params.q)
    if (params.status) query.set("status", params.status)
    if (params.event) query.set("event", params.event)
    query.set("page", String(nextPage))
    return `?${query.toString()}`
  }
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">Orders</h1><p className="text-sm text-muted-foreground">{result.total} orders</p></div>
    <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_auto_auto]">
      <input name="q" defaultValue={params.q} placeholder="Order number, name, email or phone" className="h-9 rounded-lg border bg-background px-3 text-sm" />
      <select name="status" defaultValue={params.status ?? ""} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">All statuses</option>{["PENDING_PAYMENT","PAID","COMPLETED","CANCELLED"].map(s => <option key={s}>{s}</option>)}</select>
      <select name="event" defaultValue={params.event ?? ""} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">All events</option>{events.map(e => <option value={e.id} key={e.id}>{e.name}</option>)}</select>
      <button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground sm:col-span-3">Apply filters</button>
    </form>
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm"><thead className="border-b text-left text-muted-foreground"><tr>{["Order","Customer","Date","Photos","Total","Status","Actions"].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
      <tbody>{result.orders.map(order => <tr key={order.id} className="border-b last:border-0">
        <td className="p-3"><Link className="font-mono font-medium text-primary" href={`/admin/orders/${order.orderNumber}`}>{order.orderNumber}</Link></td>
        <td className="p-3"><p>{order.customerName}</p><p className="text-xs text-muted-foreground">{order.customerEmail || order.customerPhone || "—"}</p></td>
        <td className="p-3 whitespace-nowrap">{formatDateTime(order.createdAt)}</td><td className="p-3">{order.itemCount}</td><td className="p-3">{formatPrice(order.totalAmount)}</td><td className="p-3">{order.status.replaceAll("_"," ")}</td>
        <td className="p-3"><OrderActions orderId={order.id} status={order.status} /></td></tr>)}</tbody></table>
      {result.orders.length === 0 && <p className="p-10 text-center text-muted-foreground">No matching orders.</p>}</div>
    <div className="flex justify-between text-sm"><span>Page {page} of {Math.max(1,result.totalPages)}</span><div className="flex gap-3">{page > 1 && <Link href={pageUrl(page-1)}>Previous</Link>}{page < result.totalPages && <Link href={pageUrl(page+1)}>Next</Link>}</div></div>
  </div>
}
