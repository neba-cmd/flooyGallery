import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { APIError } from "better-auth/api"
import { prisma } from "@/lib/db"

/**
 * Admin-only authentication for Flooy Photos.
 *
 * Only staff/administrators authenticate — customers never sign in. We use
 * email + password. Public self sign-up is closed: the only ways to create an
 * admin are (1) bootstrapping the very first admin when none exist, or
 * (2) an already-authenticated admin inviting a colleague. This is enforced in
 * the `before` hook on the sign-up route.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  hooks: {
    before: async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const userCount = await prisma.user.count()
        // Allow bootstrapping the first admin freely.
        if (userCount === 0) return
        // Otherwise, only an authenticated admin may create new admins.
        const session = await auth.api
          .getSession({ headers: ctx.headers ?? new Headers() })
          .catch(() => null)
        if (!session?.user) {
          throw new APIError("FORBIDDEN", {
            message: "Admin registration is closed. Ask an existing admin to invite you.",
          })
        }
      }
    },
  },
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
