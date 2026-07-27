import { prisma } from "@/lib/db"
import { serializeOrder } from "@/lib/serialize"
import type { OrderDTO, OrderStatus } from "@/types"

export type AdminStats = {
  totalOrders: number
  pendingOrders: number
  paidOrders: number
  completedOrders: number
  totalPhotos: number
  totalEvents: number
  revenuePaid: number
  revenuePending: number
  recentOrders: OrderDTO[]
  topEvents: { id: string; name: string; photoCount: number; orderCount: number }[]
}

export async function getAdminStats(): Promise<AdminStats> {
  const [
    totalOrders,
    pendingOrders,
    paidOrders,
    completedOrders,
    totalPhotos,
    totalEvents,
    paidAgg,
    pendingAgg,
    recent,
    events,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.photo.count(),
    prisma.event.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { in: ["PAID", "COMPLETED"] } } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: "PENDING_PAYMENT" } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { _count: { select: { items: true } }, event: { select: { name: true } } },
    }),
    prisma.event.findMany({
      take: 5,
      orderBy: { photos: { _count: "desc" } },
      include: { _count: { select: { photos: true, orders: true } } },
    }),
  ])

  return {
    totalOrders,
    pendingOrders,
    paidOrders,
    completedOrders,
    totalPhotos,
    totalEvents,
    revenuePaid: paidAgg._sum.totalAmount ?? 0,
    revenuePending: pendingAgg._sum.totalAmount ?? 0,
    recentOrders: recent.map(serializeOrder),
    topEvents: events.map((e) => ({
      id: e.id,
      name: e.name,
      photoCount: e._count.photos,
      orderCount: e._count.orders,
    })),
  }
}

export type AdminOrderFilters = {
  status?: OrderStatus
  search?: string
  page?: number
  pageSize?: number
}

export async function listOrders(filters: AdminOrderFilters = {}) {
  const pageSize = Math.min(filters.pageSize ?? 20, 100)
  const page = Math.max(filters.page ?? 1, 1)
  const search = filters.search?.trim()

  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" as const } },
            { customerName: { contains: search, mode: "insensitive" as const } },
            { customerEmail: { contains: search, mode: "insensitive" as const } },
            { customerPhone: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { items: true } }, event: { select: { name: true } } },
    }),
    prisma.order.count({ where }),
  ])

  return {
    orders: orders.map(serializeOrder),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getOrderDetail(orderNumber: string): Promise<OrderDTO | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim().toUpperCase() },
    include: {
      items: { include: { photo: true } },
      event: { select: { name: true } },
      _count: { select: { items: true } },
    },
  })
  return order ? serializeOrder(order) : null
}

export async function listCustomers(search?: string) {
  // Customers are derived from orders (no separate account model).
  const orders = await prisma.order.findMany({
    where: search?.trim()
      ? {
          OR: [
            { customerName: { contains: search.trim(), mode: "insensitive" } },
            { customerEmail: { contains: search.trim(), mode: "insensitive" } },
            { customerPhone: { contains: search.trim(), mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      totalAmount: true,
      status: true,
      createdAt: true,
    },
  })

  const map = new Map<
    string,
    { name: string; email: string | null; phone: string | null; orders: number; spent: number; lastOrder: string }
  >()

  for (const o of orders) {
    const key = (o.customerEmail || o.customerPhone || o.customerName).toLowerCase()
    const existing = map.get(key)
    const spent = o.status === "PAID" || o.status === "COMPLETED" ? o.totalAmount : 0
    if (existing) {
      existing.orders += 1
      existing.spent += spent
    } else {
      map.set(key, {
        name: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone,
        orders: 1,
        spent,
        lastOrder: o.createdAt.toISOString(),
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.lastOrder < b.lastOrder ? 1 : -1))
}
