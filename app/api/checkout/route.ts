import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createOrder } from "@/lib/services/orders"
import { rateLimit, clientKey } from "@/lib/rate-limit"
import {
  createOrderAccessToken,
  orderAccessCookieName,
  orderAccessCookieOptions,
} from "@/lib/order-access"
import { toPublicOrder } from "@/lib/serialize"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { createStripeCheckout, retrieveStripeCheckout } from "@/lib/stripe"

const customerFields = {
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).refine((value) => {
    if (!value) return true
    const digits = value.replace(/\D/g, "")
    return digits.length >= 8 && digits.length <= 15
  }, "Enter a valid phone number").optional().or(z.literal("")),
  checkoutKey: z.string().uuid().optional(),
}

const checkoutSchema = z.discriminatedUnion("productType", [
  z.object({
    ...customerFields,
    productType: z.literal("PHOTOS"),
    photoIds: z.array(z.string().min(1)).min(1, "Select at least one photo").max(500),
  }),
  z.object({
    ...customerFields,
    productType: z.literal("TEAM_PACKAGE"),
  }),
]).refine((value) => Boolean(value.email || value.phone), {
  message: "Enter an email address or phone number",
  path: ["email"],
})

export async function POST(req: NextRequest) {
  const limit = rateLimit(clientKey(req, "checkout"), 20, 60_000)
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
  }

  const { name, email, phone, checkoutKey, productType } = parsed.data

  try {
    const order = await createOrder({
      customerName: name,
      customerEmail: email || undefined,
      customerPhone: phone || undefined,
      photoIds: productType === "PHOTOS" ? parsed.data.photoIds : undefined,
      productType,
      checkoutKey,
      checkoutReference: `flooy-${randomUUID()}`,
    })
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    let checkout
    if (stored.stripeSessionId) {
      checkout = await retrieveStripeCheckout(stored.stripeSessionId)
    } else {
      const accessToken = createOrderAccessToken(order.orderNumber)
      const redirect = new URL("/payment-complete", env.appUrl)
      redirect.searchParams.set("order", order.orderNumber)
      redirect.searchParams.set("access", accessToken)
      checkout = await createStripeCheckout({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountMinor: order.totalAmount,
        currency: order.currency,
        customerEmail: order.customerEmail ?? undefined,
        successUrl: redirect.toString(),
        cancelUrl: new URL("/checkout", env.appUrl).toString(),
        idempotencyKey: stored.checkoutReference!,
      })
      if (!checkout.url) throw new Error("Stripe did not return a hosted checkout URL")
      const claimed = await prisma.order.updateMany({
        where: { id: order.id, stripeSessionId: null },
        data: { stripeSessionId: checkout.id, stripeCheckoutUrl: checkout.url },
      })
      if (claimed.count === 0) {
        const winner = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
        checkout = await retrieveStripeCheckout(winner.stripeSessionId!)
      }
    }
    const hostedCheckoutUrl = checkout.url ?? stored.stripeCheckoutUrl
    if (!hostedCheckoutUrl) throw new Error("Stripe did not return a hosted checkout URL")
    const response = NextResponse.json({ order: toPublicOrder(order), hostedCheckoutUrl }, { status: 201 })
    response.cookies.set(
      orderAccessCookieName(order.orderNumber),
      createOrderAccessToken(order.orderNumber),
      orderAccessCookieOptions,
    )
    return response
  } catch (err) {
    const known = new Set([
      "Cannot create an order with no photos",
      "None of the selected photos are available",
      "One or more selected photos are no longer available",
      "One or more selected photos has an invalid price",
      "Could not generate a unique order number, please try again",
    ])
    const message = err instanceof Error && known.has(err.message) ? err.message : "Checkout is temporarily unavailable"
    if (message === "Checkout is temporarily unavailable") {
      // Keep provider credentials and response bodies out of logs, while
      // retaining enough context to diagnose configuration/API failures.
      console.error("[checkout] Order or Stripe checkout creation failed", {
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
    return NextResponse.json({ error: message }, { status: message.startsWith("Checkout is") ? 503 : 400 })
  }
}
