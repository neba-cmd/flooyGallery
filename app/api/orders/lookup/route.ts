import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { clientKey, rateLimit } from "@/lib/rate-limit"
import {
  createOrderAccessToken,
  orderAccessCookieName,
  orderAccessCookieOptions,
} from "@/lib/order-access"

const lookupSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().regex(/^FLOOY-\d{5,7}$/),
  contact: z.string().trim().min(3).max(200),
})

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "")
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "order-lookup"), 10, 60_000)
  if (!limit.success) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 })
  }

  const parsed = lookupSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid order number and contact detail." }, { status: 400 })
  }

  const { orderNumber, contact } = parsed.data
  let order: { customerEmail: string | null; customerPhone: string | null } | null
  try {
    order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { customerEmail: true, customerPhone: true },
    })
  } catch {
    console.error("[order-lookup] Database query failed")
    return NextResponse.json({ error: "Order lookup is temporarily unavailable." }, { status: 503 })
  }

  const emailMatches =
    Boolean(order?.customerEmail) &&
    order?.customerEmail?.trim().toLowerCase() === contact.toLowerCase()
  const suppliedPhone = normalizePhone(contact)
  const phoneMatches =
    Boolean(order?.customerPhone) &&
    suppliedPhone.length >= 7 &&
    normalizePhone(order?.customerPhone ?? "") === suppliedPhone

  if (!order || (!emailMatches && !phoneMatches)) {
    return NextResponse.json(
      { error: "We could not verify that order number and contact detail." },
      { status: 404 },
    )
  }

  const response = NextResponse.json({ url: `/orders/${encodeURIComponent(orderNumber)}` })
  response.cookies.set(
    orderAccessCookieName(orderNumber),
    createOrderAccessToken(orderNumber),
    orderAccessCookieOptions,
  )
  return response
}
