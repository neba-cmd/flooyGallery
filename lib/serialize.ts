import type { OrderDTO, OrderItemDTO, PhotoDTO, EventDTO } from "@/types"

/**
 * Serializers convert Prisma rows (with Date objects and nullable price
 * overrides) into plain JSON DTOs safe to pass across the RSC boundary.
 */

type PhotoRow = {
  id: string
  eventId: string
  filename: string
  photoNumber: number | null
  photographer: string | null
  previewUrl: string
  width: number | null
  height: number | null
  fileSize: number | null
  price: number | null
  takenAt: Date | null
  createdAt: Date
  event?: { name: string; defaultPrice: number } | null
}

export function effectivePrice(
  photoPrice: number | null,
  eventDefaultPrice: number | undefined,
): number {
  return photoPrice ?? eventDefaultPrice ?? 0
}

export function serializePhoto(row: PhotoRow): PhotoDTO {
  return {
    id: row.id,
    eventId: row.eventId,
    eventName: row.event?.name,
    filename: row.filename,
    photoNumber: row.photoNumber,
    photographer: row.photographer,
    previewUrl: row.previewUrl,
    width: row.width,
    height: row.height,
    fileSize: row.fileSize,
    price: effectivePrice(row.price, row.event?.defaultPrice),
    takenAt: row.takenAt ? row.takenAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

type EventRow = {
  id: string
  name: string
  slug: string
  location: string | null
  date: Date | null
  defaultPrice: number
  _count?: { photos: number }
}

export function serializeEvent(row: EventRow): EventDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    location: row.location,
    date: row.date ? row.date.toISOString() : null,
    defaultPrice: row.defaultPrice,
    photoCount: row._count?.photos,
  }
}

type OrderRow = {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  status: string
  totalAmount: number
  createdAt: Date
  paidAt: Date | null
  completedAt: Date | null
  event?: { name: string } | null
  _count?: { items: number }
  items?: Array<{
    id: string
    photoId: string
    unitPrice: number
    photo: PhotoRow
  }>
}

export function serializeOrder(row: OrderRow): OrderDTO {
  const items: OrderItemDTO[] | undefined = row.items?.map((it) => ({
    id: it.id,
    photoId: it.photoId,
    unitPrice: it.unitPrice,
    photo: serializePhoto(it.photo),
  }))

  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    status: row.status as OrderDTO["status"],
    totalAmount: row.totalAmount,
    eventName: row.event?.name ?? null,
    itemCount: row._count?.items ?? items?.length ?? 0,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    items,
  }
}
