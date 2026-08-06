"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/session"
import { updateOrderStatus } from "@/lib/services/orders"
import type { OrderStatus } from "@/types"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { Prisma } from "@/lib/generated/prisma/client"
import { deleteObjects } from "@/lib/storage/r2"
import { isStorageConfigured } from "@/lib/env"

const VALID: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "FAILED", "EXPIRED", "COMPLETED", "REFUNDED", "CANCELLED"]

export async function setOrderStatusAction(orderId: string, status: OrderStatus) {
  await requireAdmin()
  if (!VALID.includes(status)) {
    throw new Error("Invalid status")
  }
  const order = await updateOrderStatus(orderId, status)
  revalidatePath("/admin/orders")
  revalidatePath(`/admin/orders/${order.orderNumber}`)
  revalidatePath(`/orders/${order.orderNumber}`)
  return order
}

const eventSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  location: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  date: z.string().min(1, "Select an event date").refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date"),
  defaultPrice: z.coerce.number().int().min(1).max(1_000_000),
  published: z.boolean(),
})

export async function saveEventAction(input: z.input<typeof eventSchema>) {
  await requireAdmin()
  const parsed = eventSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Check the event details and try again.",
    }
  }
  const data = parsed.data
  let event
  try {
    event = await prisma.event.upsert({
      where: { id: data.id ?? "__new__" },
      update: {
        name: data.name, slug: data.slug, location: data.location || null,
        description: data.description || null, date: new Date(data.date),
        defaultPrice: data.defaultPrice, published: data.published,
      },
      create: {
        name: data.name, slug: data.slug, location: data.location || null,
        description: data.description || null, date: new Date(data.date),
        defaultPrice: data.defaultPrice, published: data.published,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, error: "An event with this slug already exists." }
    }
    console.error("[admin:event] Event save failed", error)
    return { ok: false as const, error: "Could not save the event." }
  }
  revalidatePath("/admin/events")
  revalidatePath("/")
  return { ok: true as const, eventId: event.id }
}

export async function toggleEventAction(id: string, published: boolean) {
  await requireAdmin()
  if (!z.string().cuid().safeParse(id).success) throw new Error("Invalid event")
  await prisma.event.update({ where: { id }, data: { published } })
  revalidatePath("/admin/events")
  revalidatePath("/")
}

const idSchema = z.string().cuid()
const photoIdsSchema = z.array(idSchema).min(1).max(100)

async function removeStoredPhotoFiles(keys: string[]) {
  if (!keys.length || !isStorageConfigured()) return false
  try {
    await deleteObjects(keys)
    return false
  } catch (error) {
    console.error("[admin:delete] Database rows deleted but R2 cleanup failed", error)
    return true
  }
}

export async function deletePhotosAction(input: string[]) {
  await requireAdmin()
  const ids = photoIdsSchema.parse(input)
  const photos = await prisma.photo.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      originalKey: true,
      previewKey: true,
      _count: { select: { orderItems: true } },
    },
  })
  if (photos.length !== ids.length) throw new Error("One or more photos no longer exist.")

  const orderedCount = photos.filter((photo) => photo._count.orderItems > 0).length
  if (orderedCount) {
    throw new Error(
      `${orderedCount} selected ${orderedCount === 1 ? "photo is" : "photos are"} attached to an order and cannot be deleted.`,
    )
  }

  await prisma.photo.deleteMany({ where: { id: { in: ids } } })
  const storageCleanupFailed = await removeStoredPhotoFiles(
    photos.flatMap((photo) => [photo.originalKey, photo.previewKey]),
  )
  revalidatePath("/admin/photos")
  revalidatePath("/admin/events")
  revalidatePath("/")
  return { deleted: photos.length, storageCleanupFailed }
}

export async function deleteEventAction(input: string) {
  await requireAdmin()
  const id = idSchema.parse(input)
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      name: true,
      photos: {
        select: {
          originalKey: true,
          previewKey: true,
          _count: { select: { orderItems: true } },
        },
      },
    },
  })
  if (!event) throw new Error("This event no longer exists.")

  const orderedCount = event.photos.filter((photo) => photo._count.orderItems > 0).length
  if (orderedCount) {
    throw new Error(
      `This event contains ${orderedCount} ordered ${orderedCount === 1 ? "photo" : "photos"}. Deactivate it instead to preserve customer orders.`,
    )
  }

  // Event deletion cascades to its photos. Historical orders remain and have
  // their optional event link cleared by the database relation.
  await prisma.event.delete({ where: { id } })
  const storageCleanupFailed = await removeStoredPhotoFiles(
    event.photos.flatMap((photo) => [photo.originalKey, photo.previewKey]),
  )
  revalidatePath("/admin/events")
  revalidatePath("/admin/photos")
  revalidatePath("/")
  return { name: event.name, deletedPhotos: event.photos.length, storageCleanupFailed }
}
