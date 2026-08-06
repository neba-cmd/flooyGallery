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
import { createSumUpCheckout, listSumUpCheckouts, retrieveSumUpCheckout } from "@/lib/sumup"

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
    if (stored.sumupCheckoutId) {
      checkout = await retrieveSumUpCheckout(stored.sumupCheckoutId)
    } else {
      const accessToken = createOrderAccessToken(order.orderNumber)
      const redirect = new URL("/payment-complete", env.appUrl)
      redirect.searchParams.set("order", order.orderNumber)
      redirect.searchParams.set("access", accessToken)
      try {
        checkout = await createSumUpCheckout({
          amountPence: order.totalAmount,
          currency: order.currency,
          reference: stored.checkoutReference!,
          description: `Flooy Photos ${order.orderNumber}`,
          redirectUrl: redirect.toString(),
          webhookUrl: new URL("/api/webhooks/sumup", env.appUrl).toString(),
        })
      } catch (error) {
        // A concurrent retry can create the unique reference first. Resolve it
        // rather than opening a second payment session.
        const matches = await listSumUpCheckouts(stored.checkoutReference!).catch(() => [])
        checkout = matches.find((item) => item.checkout_reference === stored.checkoutReference)
        if (!checkout) throw error
      }
      if (!checkout.hosted_checkout_url) throw new Error("SumUp did not return a hosted checkout URL")
      const claimed = await prisma.order.updateMany({
        where: { id: order.id, sumupCheckoutId: null },
        data: { sumupCheckoutId: checkout.id, sumupCheckoutUrl: checkout.hosted_checkout_url },
      })
      if (claimed.count === 0) {
        const winner = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
        checkout = await retrieveSumUpCheckout(winner.sumupCheckoutId!)
      }
    }
    const hostedCheckoutUrl = checkout.hosted_checkout_url ?? stored.sumupCheckoutUrl
    if (!hostedCheckoutUrl) throw new Error("SumUp did not return a hosted checkout URL")
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
      console.error("[checkout] Order creation failed")
    }
    return NextResponse.json({ error: message }, { status: message.startsWith("Checkout is") ? 503 : 400 })
  }
}
