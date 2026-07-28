import Link from "next/link"
import { getAdminStats } from "@/lib/services/admin"
import { formatPrice, formatDateTime } from "@/lib/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminDashboardPage() {
  const stats = await getAdminStats()
  const average = stats.paidOrders + stats.completedOrders
    ? Math.round(stats.revenuePaid / (stats.paidOrders + stats.completedOrders))
    : 0
  const cards = [
    ["Total revenue", formatPrice(stats.revenuePaid)],
    ["Revenue today", formatPrice(stats.revenueToday)],
    ["Pending revenue", formatPrice(stats.revenuePending)],
    ["Total orders", stats.totalOrders.toLocaleString()],
    ["Average order", formatPrice(average)],
    ["Uploaded photos", stats.totalPhotos.toLocaleString()],
    ["Events", stats.totalEvents.toLocaleString()],
    ["Customers", stats.totalCustomers.toLocaleString()],
    ["Paid orders", stats.paidOrders.toLocaleString()],
    ["Pending orders", stats.pendingOrders.toLocaleString()],
    ["Completed orders", stats.completedOrders.toLocaleString()],
    ["Cancelled orders", stats.cancelledOrders.toLocaleString()],
  ]
  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-semibold">Dashboard</h1><p className="text-sm text-muted-foreground">Live sales and gallery overview.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{value}</CardContent></Card>)}
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>Recent orders</CardTitle><Link href="/admin/orders" className="text-sm text-primary">View all</Link></CardHeader>
        <CardContent className="space-y-3">
          {stats.recentOrders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : stats.recentOrders.map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.orderNumber}`} className="flex items-center justify-between gap-4 rounded-lg border p-3 hover:bg-muted">
              <div><p className="font-mono text-sm font-medium">{order.orderNumber}</p><p className="text-xs text-muted-foreground">{order.customerName} · {formatDateTime(order.createdAt)}</p></div>
              <div className="text-right"><p className="font-medium">{formatPrice(order.totalAmount)}</p><p className="text-xs text-muted-foreground">{order.status.replaceAll("_", " ")}</p></div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
