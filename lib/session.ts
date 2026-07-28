import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/** Returns the current admin session, or null. Safe to call in RSC. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/** Guard for admin pages/actions. Redirects to login when unauthenticated. */
export async function requireAdmin() {
  const session = await getSession()
  if (!session?.user) {
    redirect("/admin/login")
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  if (user?.role !== "admin") redirect("/admin/login")
  return session
}

/** Route-handler guard that does not redirect. */
export async function hasAdminSession(): Promise<boolean> {
  const session = await getSession()
  if (!session?.user) return false
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  return user?.role === "admin"
}

/** Whether any admin account exists yet (used by the setup flow). */
export async function adminExists() {
  const { prisma } = await import("@/lib/db")
  const count = await prisma.user.count()
  return count > 0
}
