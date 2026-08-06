import "server-only"
import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { env } from "@/lib/env"

const ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function authSecret(): string {
  return env.betterAuthSecret
}

function normalizedOrderNumber(orderNumber: string): string {
  return orderNumber.trim().toUpperCase()
}

export function orderAccessCookieName(orderNumber: string): string {
  const digest = createHash("sha256").update(normalizedOrderNumber(orderNumber)).digest("hex").slice(0, 16)
  return `flooy_order_${digest}`
}

export function createOrderAccessToken(orderNumber: string): string {
  return createHmac("sha256", authSecret()).update(normalizedOrderNumber(orderNumber)).digest("base64url")
}

export function verifyOrderAccessToken(orderNumber: string, token: string | undefined): boolean {
  if (!token) return false
  const expected = createOrderAccessToken(orderNumber)
  const actualBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

export const orderAccessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // Checkout returns from a different site, so the access cookie must be sent
  // on that top-level GET navigation. It remains HttpOnly and Secure.
  sameSite: "lax" as const,
  path: "/",
  maxAge: ACCESS_MAX_AGE_SECONDS,
}
