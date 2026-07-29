import { type NextRequest, NextResponse } from "next/server"
import { getSignedDownloadUrls } from "@/lib/services/orders"
import { rateLimit, clientKey } from "@/lib/rate-limit"
import { orderAccessCookieName, verifyOrderAccessToken } from "@/lib/order-access"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const limit = rateLimit(clientKey(req, "download-all"), 10, 60_000)
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 })
  }

  const { orderNumber } = await params
  const normalized = decodeURIComponent(orderNumber).trim().toUpperCase()
  const accessToken = req.cookies.get(orderAccessCookieName(normalized))?.value
  if (!verifyOrderAccessToken(normalized, accessToken)) {
    return NextResponse.json({ error: "Order verification required" }, { status: 403 })
  }

  try {
    return NextResponse.json({ downloads: await getSignedDownloadUrls(normalized) })
  } catch (error) {
    const known = new Set([
      "Order not found",
      "This order is not paid yet",
      "Download not available for this order",
    ])
    const message =
      error instanceof Error && known.has(error.message)
        ? error.message
        : "Download service is temporarily unavailable"
    if (message === "Download service is temporarily unavailable") {
      console.error("[download-all] Signed URL generation failed", error)
    }
    const status = message.includes("not paid") || message.includes("not available")
      ? 403
      : message.includes("temporarily unavailable") ? 503 : 404
    return NextResponse.json({ error: message }, { status })
  }
}
