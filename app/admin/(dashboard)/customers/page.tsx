import Link from "next/link"
import { listCustomers } from "@/lib/services/admin"
import { formatDateTime, formatPrice } from "@/lib/format"

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const customers = await listCustomers(q)
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Customers</h1><p className="text-sm text-muted-foreground">Derived from order contact details.</p></div>
    <form><input name="q" defaultValue={q} placeholder="Search name, email or phone" className="h-10 w-full max-w-xl rounded-lg border bg-card px-3 text-sm" /></form>
    <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground">{["Customer","Contact","Orders","Total spend","Most recent"].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{customers.map(c=><tr className="border-b last:border-0" key={(c.email||c.phone||c.name).toLowerCase()}><td className="p-3 font-medium">{c.name}</td><td className="p-3">{c.email || c.phone || "—"}</td><td className="p-3"><Link className="text-primary" href={`/admin/orders?q=${encodeURIComponent(c.email||c.phone||c.name)}`}>{c.orders}</Link></td><td className="p-3">{formatPrice(c.spent)}</td><td className="p-3">{formatDateTime(c.lastOrder)}</td></tr>)}</tbody></table>{customers.length===0&&<p className="p-10 text-center text-muted-foreground">No customers found.</p>}</div>
  </div>
}
