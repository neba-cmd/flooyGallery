import { NextResponse } from "next/server"
import { z } from "zod"
import { hasAdminSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { resolvePreviewUrl } from "@/lib/storage/r2"

const schema = z.object({
  eventId: z.string().cuid(),
  photographer: z.string().trim().min(2).max(120),
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
    const photo = await prisma.$transaction(async (tx) => {
      const max = await tx.photo.aggregate({ where: { eventId: data.eventId }, _max: { photoNumber: true } })
      return tx.photo.create({ data: {
        eventId: data.eventId, photographer: data.photographer, filename: data.filename,
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
