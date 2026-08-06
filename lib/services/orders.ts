import { prisma } from "@/lib/db"
import { generateOrderNumber } from "@/lib/order-number"
import { serializeOrder, effectivePrice } from "@/lib/serialize"
import { createDownloadUrl, objectExists } from "@/lib/storage/r2"
import type { OrderDTO } from "@/types"
import { Prisma, type OrderStatus } from "@/lib/generated/prisma/client"
import { calculatePhotoPricing, TEAM_PACKAGE_PRICE } from "@/lib/pricing"

const DOWNLOAD_TTL_SECONDS = 300

export type CreateOrderInput = {
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  photoIds?: string[]
  productType?: "PHOTOS" | "TEAM_PACKAGE"
  checkoutKey?: string
}

/**
 * Create an unpaid order.
 *
 * Prices are authoritative from the database (never trusted from the client
 * cart). Runs in a transaction with a retry loop on the unique order-number
 * constraint so concurrent checkouts at a busy event never collide.
 */
export async function createOrder(input: CreateOrderInput): Promise<OrderDTO> {
  if (input.checkoutKey) {
    const existing = await prisma.order.findUnique({
      where: { checkoutKey: input.checkoutKey },
      include: { items: { include: { photo: true } }, event: true },
    })
    if (existing) return serializeOrder(existing)
  }
  if (input.productType === "TEAM_PACKAGE") {
    return createTeamPackageOrder(input)
  }

  const photoIds = Array.from(new Set(input.photoIds ?? []))
  if (photoIds.length === 0) throw new Error("Cannot create an order with no photos")

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, event: { published: true } },
    include: { event: { select: { defaultPrice: true } } },
  })

  if (photos.length === 0) throw new Error("None of the selected photos are available")
  if (photos.length !== photoIds.length) {
    throw new Error("One or more selected photos are no longer available")
  }
  const items = photos.map((p) => ({
    photoId: p.id,
    unitPrice: effectivePrice(p.price, p.event.defaultPrice),
  }))
  if (items.some((item) => !Number.isSafeInteger(item.unitPrice) || item.unitPrice <= 0)) {
    throw new Error("One or more selected photos has an invalid price")
  }
  const totalAmount = calculatePhotoPricing(items.map((item) => item.unitPrice)).total
  const eventIds = new Set(photos.map((photo) => photo.eventId))
  // Keep the convenient order-level event relation when every photo is from
  // the same gallery. Mixed-gallery orders are represented by their items,
  // each of which retains its own photo/event relation.
  const eventId = eventIds.size === 1 ? photos[0].eventId : null

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = await generateOrderNumber()
    try {
      const order = await prisma.order.create({
        data: {
          orderNumber,
          checkoutKey: input.checkoutKey,
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
      if (input.checkoutKey && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const existing = await prisma.order.findUnique({
          where: { checkoutKey: input.checkoutKey },
          include: { items: { include: { photo: true } }, event: true },
        })
        if (existing) return serializeOrder(existing)
      }
      // Unique constraint violation on orderNumber — retry with a new number.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue
      }
      throw err
    }
  }
  throw new Error("Could not generate a unique order number, please try again")
}

async function createTeamPackageOrder(input: CreateOrderInput): Promise<OrderDTO> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderNumber = await generateOrderNumber()
    try {
      const order = await prisma.order.create({
        data: {
          orderNumber,
          checkoutKey: input.checkoutKey,
          productType: "TEAM_PACKAGE",
          currency: "GBP",
          customerName: input.customerName.trim(),
          customerEmail: input.customerEmail?.trim() || null,
          customerPhone: input.customerPhone?.trim() || null,
          totalAmount: TEAM_PACKAGE_PRICE,
          status: "PENDING_PAYMENT",
        },
        include: { items: { include: { photo: true } }, event: true },
      })
      return serializeOrder(order)
    } catch (err: unknown) {
      if (input.checkoutKey && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const existing = await prisma.order.findUnique({
          where: { checkoutKey: input.checkoutKey },
          include: { items: { include: { photo: true } }, event: true },
        })
        if (existing) return serializeOrder(existing)
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue
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
  const current = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } })
  if (!current) throw new Error("Order not found")
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    PENDING_PAYMENT: ["PAID", "CANCELLED"],
    PAID: ["COMPLETED", "REFUNDED"],
    COMPLETED: ["PAID", "REFUNDED"],
    REFUNDED: [],
    CANCELLED: ["PENDING_PAYMENT"],
  }
  if (current.status !== status && !allowed[current.status].includes(status)) {
    throw new Error(`Cannot change an order from ${current.status} to ${status}`)
  }
  const timestamps: Record<string, Date | null> = {}
  if (status === "PAID") {
    timestamps.paidAt = new Date()
    timestamps.completedAt = null
    timestamps.refundedAt = null
    timestamps.cancelledAt = null
  }
  if (status === "COMPLETED") {
    timestamps.completedAt = new Date()
    timestamps.cancelledAt = null
  }
  if (status === "REFUNDED") {
    timestamps.refundedAt = new Date()
    timestamps.cancelledAt = null
  }
  if (status === "CANCELLED") timestamps.cancelledAt = new Date()
  if (status === "PENDING_PAYMENT") {
    timestamps.paidAt = null
    timestamps.completedAt = null
    timestamps.refundedAt = null
    timestamps.cancelledAt = null
  }

  const update = await prisma.order.updateMany({
    where: { id: orderId, status: current.status },
    data: { status, ...timestamps },
  })
  if (update.count !== 1) throw new Error("Order status changed elsewhere. Refresh and try again.")
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { photo: true } }, event: true },
  })
  return serializeOrder(order)
}

/**
 * Generate a short-lived signed URL for a purchased original.
 *
 * Only works when the order is paid/completed and the item belongs to that
 * order. Originals are never exposed publicly — the customer only ever
 * receives a temporary, expiring link.
 */
export async function getSignedDownloadUrl(orderNumber: string, itemId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim().toUpperCase() },
    select: { id: true, status: true },
  })
  if (!order) throw new Error("Order not found")
  if (order.status !== "PAID" && order.status !== "COMPLETED") {
    throw new Error("This order is not paid yet")
  }

  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId: order.id },
    include: { photo: { select: { originalKey: true, filename: true } } },
  })
  if (!item) throw new Error("Download not available for this order")
  if (!(await objectExists(item.photo.originalKey))) {
    throw new Error("The original file is temporarily unavailable")
  }

  return createDownloadUrl(item.photo.originalKey, item.photo.filename, DOWNLOAD_TTL_SECONDS)
}

export async function getSignedDownloadUrls(orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim().toUpperCase() },
    select: {
      status: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          photo: { select: { originalKey: true, filename: true } },
        },
      },
    },
  })
  if (!order) throw new Error("Order not found")
  if (order.status !== "PAID" && order.status !== "COMPLETED") {
    throw new Error("This order is not paid yet")
  }
  if (order.items.length === 0) throw new Error("Download not available for this order")

  return Promise.all(
    order.items.map(async (item) => ({
      itemId: item.id,
      filename: item.photo.filename,
      url: await createDownloadUrl(
        item.photo.originalKey,
        item.photo.filename,
        DOWNLOAD_TTL_SECONDS,
      ),
    })),
  )
}
