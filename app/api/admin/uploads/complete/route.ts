import { NextResponse } from "next/server"
import { z } from "zod"
import { hasAdminSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import {
  deleteObjects,
  getObjectMetadata,
  getObjectPrefix,
  resolvePreviewUrl,
} from "@/lib/storage/r2"

const MAX_ORIGINAL_BYTES = 30 * 1024 * 1024
const MAX_PREVIEW_BYTES = 5 * 1024 * 1024
const ORIGINAL_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function detectedImageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png"
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp"
  return null
}

const schema = z.object({
  eventId: z.string().cuid(),
  photographer: z.string().trim().min(2).max(120),
  dayOfWeek: z.number().int().min(1).max(7),
  filename: z.string().trim().min(1).max(240),
  originalKey: z.string().max(500),
  previewKey: z.string().max(500),
  width: z.number().int().positive().max(100_000),
  height: z.number().int().positive().max(100_000),
  fileSize: z.number().int().positive().max(30 * 1024 * 1024),
})

export async function POST(request: Request) {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid metadata" }, { status: 400 })
  const data = parsed.data
  const prefix = `events/${data.eventId}/`
  if (!data.originalKey.startsWith(`${prefix}originals/`) || !data.previewKey.startsWith(`${prefix}previews/`) ||
      data.originalKey.includes("..") || data.previewKey.includes("..")) {
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 })
  }
  try {
    const [originalMetadata, previewMetadata, originalPrefix, previewPrefix] = await Promise.all([
      getObjectMetadata(data.originalKey),
      getObjectMetadata(data.previewKey),
      getObjectPrefix(data.originalKey),
      getObjectPrefix(data.previewKey),
    ])
    const originalDetectedType = detectedImageType(originalPrefix)
    const previewDetectedType = detectedImageType(previewPrefix)
    if (
      !ORIGINAL_TYPES.has(originalMetadata.contentType) ||
      originalDetectedType !== originalMetadata.contentType ||
      originalMetadata.contentLength !== data.fileSize ||
      originalMetadata.contentLength > MAX_ORIGINAL_BYTES ||
      previewMetadata.contentType !== "image/jpeg" ||
      previewDetectedType !== "image/jpeg" ||
      previewMetadata.contentLength > MAX_PREVIEW_BYTES
    ) {
      try {
        await deleteObjects([data.originalKey, data.previewKey])
      } catch {
        console.error("[upload] Invalid objects could not be cleaned up")
      }
      return NextResponse.json({ error: "Uploaded files failed image validation" }, { status: 400 })
    }

    const photo = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.eventId}))`
      const existing = await tx.photo.findFirst({
        where: { originalKey: data.originalKey, previewKey: data.previewKey },
        select: { id: true, photoNumber: true },
      })
      if (existing) return existing
      const max = await tx.photo.aggregate({ where: { eventId: data.eventId }, _max: { photoNumber: true } })
      return tx.photo.create({ data: {
        eventId: data.eventId, photographer: data.photographer, dayOfWeek: data.dayOfWeek, filename: data.filename,
        originalKey: data.originalKey, previewKey: data.previewKey, previewUrl: resolvePreviewUrl(data.previewKey),
        width: data.width, height: data.height, fileSize: data.fileSize,
        photoNumber: (max._max.photoNumber ?? 0) + 1,
      } })
    })
    return NextResponse.json({ id: photo.id, photoNumber: photo.photoNumber }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Could not save photo metadata" }, { status: 500 })
  }
}
