import { prisma } from "@/lib/db"
import { serializeEvent } from "@/lib/serialize"
import type { EventDTO } from "@/types"

export async function listPublishedEvents(): Promise<EventDTO[]> {
  const events = await prisma.event.findMany({
    where: { published: true },
    orderBy: { date: "desc" },
    include: { _count: { select: { photos: true } } },
  })
  return events.map(serializeEvent)
}

export async function listAllEvents(): Promise<EventDTO[]> {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { photos: true } } },
  })
  return events.map(serializeEvent)
}

export async function getEventBySlug(slug: string): Promise<EventDTO | null> {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: { _count: { select: { photos: true } } },
  })
  return event ? serializeEvent(event) : null
}
