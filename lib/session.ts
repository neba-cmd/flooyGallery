import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

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
  return session
}

/** Whether any admin account exists yet (used by the setup flow). */
export async function adminExists() {
  const { prisma } = await import("@/lib/db")
  const count = await prisma.user.count()
  return count > 0
}
