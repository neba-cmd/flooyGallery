import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { clientKey, rateLimit } from "@/lib/rate-limit"
import { orderAccessCookieName, verifyOrderAccessToken } from "@/lib/order-access"
import { verifyAndSyncSumUpCheckout } from "@/lib/services/payments"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const limit = rateLimit(clientKey(request, "payment-status"), 30, 60_000)
  if (!limit.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  const normalized = decodeURIComponent((await params).orderNumber).trim().toUpperCase()
  const token = request.cookies.get(orderAccessCookieName(normalized))?.value
    ?? request.nextUrl.searchParams.get("access") ?? undefined
  if (!verifyOrderAccessToken(normalized, token)) {
    return NextResponse.json({ error: "Order verification required" }, { status: 403 })
  }
  const order = await prisma.order.findUnique({
    where: { orderNumber: normalized },
    select: { id: true, status: true, sumupCheckoutId: true },
  })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  try {
    const synced = order.sumupCheckoutId && !["PAID", "COMPLETED", "REFUNDED"].includes(order.status)
      ? await verifyAndSyncSumUpCheckout(order.sumupCheckoutId)
      : order
    return NextResponse.json({ status: synced?.status ?? order.status })
  } catch (error) {
    console.error("[payment-status] Verification failed", error)
    return NextResponse.json({ status: order.status, verificationUnavailable: true })
  }
}
