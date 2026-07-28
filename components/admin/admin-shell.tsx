"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Camera, CalendarDays, Images, LayoutDashboard, LogOut, ShoppingBag, Users } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/photos", label: "Photos", icon: Images },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/photographers", label: "Photographers", icon: Camera },
  { href: "/admin/customers", label: "Customers", icon: Users },
]

export function AdminShell({ children, user }: { children: React.ReactNode; user: { name: string; email: string } }) {
  const pathname = usePathname()
  const router = useRouter()
  return (
    <div className="min-h-dvh bg-muted/30 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b bg-card lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/admin" className="font-semibold tracking-tight">Flooy Admin</Link>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Sign out"
            onClick={async () => {
              await authClient.signOut()
              router.push("/admin/login")
              router.refresh()
            }}
          ><LogOut /></Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)) ? "bg-muted font-medium text-foreground" : "",
            )}><Icon className="size-4" />{label}</Link>
          ))}
        </nav>
        <div className="hidden border-t p-4 text-xs lg:block">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-muted-foreground">{user.email}</p>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  )
}
