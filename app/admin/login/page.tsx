import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { LoginForm } from "./login-form"

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage() {
  const session = await getSession()
  if (session) redirect("/admin")

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <span className="text-lg font-semibold">F</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Flooy Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage events and orders</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
