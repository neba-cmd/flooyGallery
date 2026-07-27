import { prisma } from "@/lib/db"
import { generateOrderNumber } from "@/lib/order-number"
import { serializeOrder, effectivePrice } from "@/lib/serialize"
import type { OrderDTO } from "@/types"
import type { OrderStatus } from "@/lib/generated/prisma/client"

export type CreateOrderInput = {
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  photoIds: string[]
}

/**
 * Create an unpaid order.
 *
 * Prices are authoritative from the database (never trusted from the client
 * cart). Runs in a transaction with a retry loop on the unique order-number
 * constraint so concurrent checkouts at a busy event never collide.
 */
export async function createOrder(input: CreateOrderInput): Promise<OrderDTO> {
  const photoIds = Array.from(new Set(input.photoIds))
  if (photoIds.length === 0) throw new Error("Cannot create an order with no photos")

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, event: { published: true } },
    include: { event: { select: { defaultPrice: true } } },
  })

  if (photos.length === 0) throw new Error("None of the selected photos are available")

  const items = photos.map((p) => ({
    photoId: p.id,
    unitPrice: effectivePrice(p.price, p.event.defaultPrice),
  }))
  const totalAmount = items.reduce((sum, i) => sum + i.unitPrice, 0)
  const eventId = photos[0].eventId

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = generateOrderNumber()
    try {
      const order = await prisma.order.create({
        data: {
          orderNumber,
          eventId,
          customerName: input.customerName.trim(),
          customerEmail: input.customerEmail?.trim() || null,
          customerPhone: input.customerPhone?.trim() || null,
          totalAmount,
          status: "PENDING_PAYMENT",
          items: { create: items },
        },
        include: { items: { include: { photo: true } }, event: true },
      })
      return serializeOrder(order)
    } catch (err: unknown) {
      // Unique constraint violation on orderNumber — retry with a new number.
      if (typeof err === "object" && err && "code" in err && (err as { code: string }).code === "P2002") {
        continue
      }
      throw err
    }
  }
  throw new Error("Could not generate a unique order number, please try again")
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderDTO | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim().toUpperCase() },
    include: { items: { include: { photo: true } }, event: true },
  })
  return order ? serializeOrder(order) : null
}

export async function listOrders(options?: {
  status?: OrderStatus
  search?: string
  take?: number
}): Promise<OrderDTO[]> {
  const orders = await prisma.order.findMany({
    where: {
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.search
        ? {
            OR: [
              { orderNumber: { contains: options.search, mode: "insensitive" } },
              { customerName: { contains: options.search, mode: "insensitive" } },
              { customerEmail: { contains: options.search, mode: "insensitive" } },
              { customerPhone: { contains: options.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { items: { include: { photo: true } }, event: true },
    orderBy: { createdAt: "desc" },
    take: options?.take ?? 100,
  })
  return orders.map(serializeOrder)
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderDTO> {
  const timestamps: Record<string, Date | null> = {}
  if (status === "PAID") timestamps.paidAt = new Date()
  if (status === "COMPLETED") timestamps.completedAt = new Date()
  if (status === "CANCELLED") timestamps.cancelledAt = new Date()

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status, ...timestamps },
    include: { items: { include: { photo: true } }, event: true },
  })
  return serializeOrder(order)
}
