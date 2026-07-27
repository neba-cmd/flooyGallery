import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createOrder } from "@/lib/services/orders"
import { rateLimit, clientKey } from "@/lib/rate-limit"

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  photoIds: z.array(z.string().min(1)).min(1, "Select at least one photo").max(500),
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

  const { name, email, phone, photoIds } = parsed.data

  try {
    const order = await createOrder({
      customerName: name,
      customerEmail: email || undefined,
      customerPhone: phone || undefined,
      photoIds,
    })
    return NextResponse.json({ order }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
