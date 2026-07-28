import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

/**
 * Optimistic edge guard for the admin area. It only checks for the presence of
 * a valid session cookie (fast, no DB call); full verification happens in the
 * server components via `requireAdmin()`. Login/setup pages stay public.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicAdminRoute =
    pathname === "/admin/login" || pathname === "/admin/setup"

  if (pathname.startsWith("/admin") && !isPublicAdminRoute) {
    const sessionCookie = getSessionCookie(request)
    if (!sessionCookie) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
