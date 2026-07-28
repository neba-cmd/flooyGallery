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

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).refine(
    (value) => !value || value.replace(/\D/g, "").length >= 7,
    "Enter a valid phone number",
  ).optional().or(z.literal("")),
  photoIds: z.array(z.string().min(1)).min(1, "Select at least one photo").max(500),
  checkoutKey: z.string().uuid().optional(),
}).refine((value) => Boolean(value.email || value.phone), {
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

  const { name, email, phone, photoIds, checkoutKey } = parsed.data

  try {
    const order = await createOrder({
      customerName: name,
      customerEmail: email || undefined,
      customerPhone: phone || undefined,
      photoIds,
      checkoutKey,
    })
    const response = NextResponse.json({ order: toPublicOrder(order) }, { status: 201 })
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
      "Photos from different events must be ordered separately",
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
