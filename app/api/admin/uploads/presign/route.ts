import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { hasAdminSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { createUploadUrl, originalKey, previewKey } from "@/lib/storage/r2"

const PREVIEW_CACHE_CONTROL = "public, max-age=31536000, immutable"

const schema = z.object({
  eventId: z.string().cuid(),
  filename: z.string().trim().min(1).max(240),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  previewContentType: z.enum(["image/jpeg", "image/webp"]),
  fileSize: z.number().int().positive().max(30 * 1024 * 1024),
})

export async function POST(request: Request) {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid upload" }, { status: 400 })
  if (!(await prisma.event.findUnique({ where: { id: parsed.data.eventId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }
  const token = randomUUID()
  const extension = parsed.data.contentType === "image/png" ? "png" : parsed.data.contentType === "image/webp" ? "webp" : "jpg"
  const original = originalKey(parsed.data.eventId, `${token}.${extension}`)
  const preview = previewKey(parsed.data.eventId, `${token}.jpg`)
  try {
    const [originalUrl, previewUrl] = await Promise.all([
      createUploadUrl(original, parsed.data.contentType),
      createUploadUrl(preview, parsed.data.previewContentType, 600, PREVIEW_CACHE_CONTROL),
    ])
    return NextResponse.json({
      originalUrl,
      previewUrl,
      originalKey: original,
      previewKey: preview,
      previewCacheControl: PREVIEW_CACHE_CONTROL,
    })
  } catch {
    return NextResponse.json({ error: "Object storage is unavailable or not configured" }, { status: 503 })
  }
}
