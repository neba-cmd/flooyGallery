import type React from "react"
import { requireAdmin } from "@/lib/session"
import { AdminShell } from "@/components/admin/admin-shell"

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()

  return <AdminShell user={{ name: session.user.name, email: session.user.email }}>{children}</AdminShell>
}
