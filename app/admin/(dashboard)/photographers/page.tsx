import { prisma } from "@/lib/db"
import { formatPrice } from "@/lib/format"

export default async function PhotographersPage() {
  const rows = await prisma.photo.findMany({ where: { photographer: { not: null } }, select: { photographer: true, orderItems: { where: { order: { status: { in: ["PAID","COMPLETED"] } } }, select: { unitPrice: true } } } })
  const map = new Map<string,{photos:number,revenue:number}>()
  for (const row of rows) if (row.photographer) { const value=map.get(row.photographer)??{photos:0,revenue:0}; value.photos++; value.revenue+=row.orderItems.reduce((s,i)=>s+i.unitPrice,0); map.set(row.photographer,value) }
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Photographers</h1><p className="text-sm text-muted-foreground">Photographers are currently recorded on uploaded photos.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from(map).map(([name,v])=><div className="rounded-xl border bg-card p-5" key={name}><h2 className="font-semibold">{name}</h2><p className="mt-2 text-sm text-muted-foreground">{v.photos} uploaded photos</p><p className="text-sm text-muted-foreground">{formatPrice(v.revenue)} attributed sales</p></div>)}</div>{map.size===0&&<p className="rounded-xl border p-10 text-center text-muted-foreground">Photographers appear here after their first upload.</p>}</div>
}
