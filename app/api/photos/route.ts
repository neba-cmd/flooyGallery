import { NextResponse } from "next/server"
import { z } from "zod"
import { queryPhotos } from "@/lib/services/photos"
import { rateLimit, clientKey } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const querySchema = z.object({
  eventId: z.string().optional(),
  search: z.string().max(120).optional(),
  photographer: z.string().max(120).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
})

export async function GET(request: Request) {
  const limit = rateLimit(clientKey(request, "photos"), 120, 60_000)
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 })
  }

  const { dateFrom, dateTo, ...rest } = parsed.data
  const page = await queryPhotos({
    ...rest,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  })

  return NextResponse.json(page, {
    headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" },
  })
}
