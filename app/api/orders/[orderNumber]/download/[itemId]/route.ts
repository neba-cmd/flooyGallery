import { type NextRequest, NextResponse } from "next/server"
import { getSignedDownloadUrl } from "@/lib/services/orders"
import { rateLimit, clientKey } from "@/lib/rate-limit"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string; itemId: string }> },
) {
  const limit = rateLimit(clientKey(req, "download"), 60, 60_000)
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 })
  }

  const { orderNumber, itemId } = await params

  try {
    const url = await getSignedDownloadUrl(decodeURIComponent(orderNumber), itemId)
    return NextResponse.json({ url })
  } catch (err) {
    const known = new Set([
      "Order not found",
      "This order is not paid yet",
      "Download not available for this order",
      "The original file is temporarily unavailable",
    ])
    const message = err instanceof Error && known.has(err.message)
      ? err.message
      : "Download service is temporarily unavailable"
    if (message === "Download service is temporarily unavailable") {
      console.error("[download] Signed URL generation failed")
    }
    const status = message.includes("not paid") || message.includes("not available")
      ? 403
      : message.includes("temporarily unavailable") ? 503 : 404
    return NextResponse.json({ error: message }, { status })
  }
}
