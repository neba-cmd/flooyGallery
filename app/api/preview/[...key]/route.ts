import { type NextRequest, NextResponse } from "next/server"
import { getObjectStream, isStorageConfigured, resolvePreviewUrl } from "@/lib/storage/r2"
import { r2Env } from "@/lib/env"
import { clientKey, rateLimit } from "@/lib/rate-limit"

/**
 * Caching proxy for preview (watermarked) images.
 *
 * Used only when no public R2/CDN domain is configured. Previews are safe to
 * serve publicly; originals are NEVER served through this route.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const limit = rateLimit(clientKey(req, "preview"), 300, 60_000)
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 })
  }

  const { key: segments } = await params
  const key = segments.map((s) => decodeURIComponent(s)).join("/")

  // Only previews may be proxied. Never expose originals through this route.
  if (!/^events\/[^/]+\/previews\/[^/]+$/.test(key) || key.includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Old database rows and persisted carts can still contain this route. Once a
  // public preview domain is configured, redirect those requests to R2 so no
  // image body crosses the Vercel function.
  if (r2Env.publicUrl) {
    return NextResponse.redirect(resolvePreviewUrl(key), {
      status: 307,
      headers: { "Cache-Control": "public, max-age=86400" },
    })
  }

  try {
    const object = await getObjectStream(key)
    const body = object.Body as ReadableStream | null
    if (!body) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return new NextResponse(body, {
      headers: {
        "Content-Type": object.ContentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
