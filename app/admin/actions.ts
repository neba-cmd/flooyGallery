"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/session"
import { updateOrderStatus } from "@/lib/services/orders"
import type { OrderStatus } from "@/types"
import { z } from "zod"
import { prisma } from "@/lib/db"

const VALID: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "COMPLETED", "CANCELLED"]

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
  id: z.string().optional(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  location: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  date: z.string().optional(),
  defaultPrice: z.coerce.number().int().min(0).max(1_000_000),
  published: z.boolean(),
})

export async function saveEventAction(input: z.input<typeof eventSchema>) {
  await requireAdmin()
  const data = eventSchema.parse(input)
  const event = await prisma.event.upsert({
    where: { id: data.id ?? "__new__" },
    update: {
      name: data.name, slug: data.slug, location: data.location || null,
      description: data.description || null, date: data.date ? new Date(data.date) : null,
      defaultPrice: data.defaultPrice, published: data.published,
    },
    create: {
      name: data.name, slug: data.slug, location: data.location || null,
      description: data.description || null, date: data.date ? new Date(data.date) : null,
      defaultPrice: data.defaultPrice, published: data.published,
    },
  })
  revalidatePath("/admin/events")
  revalidatePath("/")
  return event.id
}

export async function toggleEventAction(id: string, published: boolean) {
  await requireAdmin()
  if (!z.string().cuid().safeParse(id).success) throw new Error("Invalid event")
  await prisma.event.update({ where: { id }, data: { published } })
  revalidatePath("/admin/events")
  revalidatePath("/")
}
