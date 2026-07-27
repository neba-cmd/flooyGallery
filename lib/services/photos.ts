import { prisma } from "@/lib/db"
import { serializePhoto } from "@/lib/serialize"
import type { PhotoDTO } from "@/types"
import type { Prisma } from "@/lib/generated/prisma/client"

export type PhotoQuery = {
  eventId?: string
  search?: string
  photographer?: string
  dateFrom?: Date
  dateTo?: Date
  cursor?: string
  limit?: number
}

export type PhotoPage = {
  photos: PhotoDTO[]
  nextCursor: string | null
  total: number
}

const MAX_LIMIT = 60
const DEFAULT_LIMIT = 30

/**
 * Cursor-paginated photo query used by the customer gallery.
 *
 * Searchable by: filename, photo number, photographer, event, date/time.
 * Facial search is intentionally NOT implemented — the `where` builder is
 * isolated here so a future `faceEmbedding` similarity clause can be added
 * without touching callers.
 */
export async function queryPhotos(query: PhotoQuery): Promise<PhotoPage> {
  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

  const where: Prisma.PhotoWhereInput = {
    event: { published: true },
  }

  if (query.eventId) where.eventId = query.eventId
  if (query.photographer) where.photographer = { equals: query.photographer, mode: "insensitive" }

  if (query.dateFrom || query.dateTo) {
    where.takenAt = {}
    if (query.dateFrom) where.takenAt.gte = query.dateFrom
    if (query.dateTo) where.takenAt.lte = query.dateTo
  }

  if (query.search) {
    const term = query.search.trim()
    const asNumber = Number.parseInt(term.replace(/[^0-9]/g, ""), 10)
    where.OR = [
      { filename: { contains: term, mode: "insensitive" } },
      { photographer: { contains: term, mode: "insensitive" } },
      { event: { name: { contains: term, mode: "insensitive" }, published: true } },
      ...(Number.isFinite(asNumber) ? [{ photoNumber: asNumber }] : []),
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      include: { event: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    }),
    prisma.photo.count({ where }),
  ])

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    photos: page.map(serializePhoto),
    nextCursor: hasMore ? page[page.length - 1].id : null,
    total,
  }
}

export async function getPhotoById(id: string): Promise<PhotoDTO | null> {
  const photo = await prisma.photo.findFirst({
    where: { id, event: { published: true } },
    include: { event: true },
  })
  return photo ? serializePhoto(photo) : null
}

export async function listPhotographers(): Promise<string[]> {
  const rows = await prisma.photo.findMany({
    where: { photographer: { not: null }, event: { published: true } },
    select: { photographer: true },
    distinct: ["photographer"],
    orderBy: { photographer: "asc" },
  })
  return rows.map((r) => r.photographer!).filter(Boolean)
}
