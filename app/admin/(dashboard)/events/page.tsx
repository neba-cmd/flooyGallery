import { prisma } from "@/lib/db"
import { formatDate, formatPrice } from "@/lib/format"
import { EventForm } from "@/components/admin/event-form"
import { EventDeleteButton } from "@/components/admin/event-delete-button"

export default async function EventsPage() {
  const events = await prisma.event.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { photos: true, orders: true } }, orders: { where: { status: { in: ["PAID","COMPLETED"] } }, select: { totalAmount: true } } } })
  return <div className="space-y-6"><div className="flex items-start justify-between"><div><h1 className="text-2xl font-semibold">Events</h1><p className="text-sm text-muted-foreground">Manage public galleries and pricing.</p></div><EventForm /></div>
    <div className="grid gap-4">{events.map(e => <div key={e.id} className="rounded-xl border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex gap-2"><h2 className="font-semibold">{e.name}</h2><span className="text-xs text-muted-foreground">{e.published ? "Active" : "Inactive"}</span></div><p className="text-sm text-muted-foreground">{e.date ? formatDate(e.date.toISOString()) : "No date"} · {e.location || "No location"}</p><p className="mt-2 text-sm">{e._count.photos} photos · {e._count.orders} orders · {formatPrice(e.orders.reduce((s,o)=>s+o.totalAmount,0))} revenue</p></div><div className="flex flex-wrap gap-2"><EventForm event={{ id:e.id,name:e.name,slug:e.slug,location:e.location,date:e.date?.toISOString()??null,defaultPrice:e.defaultPrice,photoCount:e._count.photos,description:e.description,published:e.published }} /><EventDeleteButton id={e.id} name={e.name} photoCount={e._count.photos} /></div></div></div>)}
    {events.length === 0 && <p className="rounded-xl border p-10 text-center text-muted-foreground">No events yet.</p>}</div>
  </div>
}
