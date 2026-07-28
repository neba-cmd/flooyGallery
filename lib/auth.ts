import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"

/**
 * Admin-only authentication for Flooy Photos.
 *
 * Only staff/administrators authenticate — customers never sign in. We use
 * email + password. Public self sign-up is closed; the first administrator is
 * created with the explicit seed script from a trusted environment.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.betterAuthSecret,
  baseURL: env.betterAuthUrl,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        throw new APIError("FORBIDDEN", {
          message: "Admin registration is closed.",
        })
      }
    }),
  },
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
