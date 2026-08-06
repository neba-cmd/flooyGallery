import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { verifyAndSyncSumUpCheckout } from "@/lib/services/payments"

const eventSchema = z.object({
  event_type: z.string().max(100),
  id: z.string().min(1).max(200),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }
  const parsed = eventSchema.safeParse(body)
  if (!parsed.success || parsed.data.event_type !== "CHECKOUT_STATUS_CHANGED") {
    return new NextResponse(null, { status: 204 })
  }
  try {
    // The notification is only a hint. All payment facts are fetched directly
    // from SumUp before any order state changes.
    await verifyAndSyncSumUpCheckout(parsed.data.id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[sumup-webhook] Verification failed", error)
    return new NextResponse(null, { status: 503 })
  }
}
