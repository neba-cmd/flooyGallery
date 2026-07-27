import type React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { AdminShell } from "@/components/admin/admin-shell"

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/admin/login")

  return <AdminShell user={{ name: session.user.name, email: session.user.email }}>{children}</AdminShell>
}
