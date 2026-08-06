import { type NextRequest, NextResponse } from "next/server"
import { ZipArchive } from "archiver"
import { Readable } from "node:stream"
import { getDownloadFiles } from "@/lib/services/orders"
import { getObjectStream } from "@/lib/storage/r2"
import { rateLimit, clientKey } from "@/lib/rate-limit"
import { orderAccessCookieName, verifyOrderAccessToken } from "@/lib/order-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function safeFilename(value: string) {
  return value.replace(/[\u0000-\u001f\u007f/\\"]/g, "_").trim().slice(0, 180) || "photo"
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const limit = rateLimit(clientKey(req, "download-all"), 10, 60_000)
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 })
  }

  const normalized = decodeURIComponent((await params).orderNumber).trim().toUpperCase()
  const accessToken = req.cookies.get(orderAccessCookieName(normalized))?.value
    ?? req.nextUrl.searchParams.get("access") ?? undefined
  if (!verifyOrderAccessToken(normalized, accessToken)) {
    return NextResponse.json({ error: "Order verification required" }, { status: 403 })
  }

  try {
    const files = await getDownloadFiles(normalized)
    const archive = new ZipArchive({ zlib: { level: 0 } })
    const usedNames = new Map<string, number>()

    archive.on("warning", (error) => console.warn("[download-all] ZIP warning", error.message))
    archive.on("error", (error) => archive.destroy(error))

    void (async () => {
      try {
        for (const file of files) {
          const base = safeFilename(file.filename)
          const seen = usedNames.get(base) ?? 0
          usedNames.set(base, seen + 1)
          const name = seen === 0 ? base : `${seen + 1}-${base}`
          const object = await getObjectStream(file.originalKey)
          if (!object.Body) throw new Error("Storage object has no body")
          archive.append(object.Body as Readable, { name })
        }
        await archive.finalize()
      } catch (error) {
        archive.destroy(error as Error)
      }
    })()

    return new NextResponse(Readable.toWeb(archive) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeFilename(normalized)}-photos.zip"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    const known = new Set([
      "Order not found",
      "This order is not paid yet",
      "Download not available for this order",
      "The original file is temporarily unavailable",
    ])
    const message = error instanceof Error && known.has(error.message)
      ? error.message
      : "Download service is temporarily unavailable"
    if (message === "Download service is temporarily unavailable") {
      console.error("[download-all] ZIP creation failed", error)
    }
    const status = message.includes("not paid") || message.includes("not available")
      ? 403
      : message.includes("temporarily unavailable") ? 503 : 404
    return NextResponse.json({ error: message }, { status })
  }
}
