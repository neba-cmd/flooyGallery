import { prisma } from "@/lib/db"
import { serializeOrder } from "@/lib/serialize"
import type { OrderDTO, OrderStatus } from "@/types"
import { Prisma } from "@/lib/generated/prisma/client"

export type AdminStats = {
  totalOrders: number
  pendingOrders: number
  paidOrders: number
  completedOrders: number
  cancelledOrders: number
  totalCustomers: number
  revenueToday: number
  totalPhotos: number
  totalEvents: number
  revenuePaid: number
  revenuePending: number
  recentOrders: OrderDTO[]
  topEvents: { id: string; name: string; photoCount: number; orderCount: number; revenue: number }[]
}

export async function getAdminStats(): Promise<AdminStats> {
  const [
    totalOrders,
    pendingOrders,
    paidOrders,
    completedOrders,
    cancelledOrders,
    totalPhotos,
    totalEvents,
    paidAgg,
    pendingAgg,
    todayAgg,
    recent,
    events,
    eventRevenue,
    customerCount,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.photo.count(),
    prisma.event.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { in: ["PAID", "COMPLETED"] } } }),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: "PENDING_PAYMENT" } }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: { in: ["PAID", "COMPLETED"] },
        paidAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
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
    prisma.order.groupBy({
      by: ["eventId"],
      where: { eventId: { not: null }, status: { in: ["PAID", "COMPLETED"] } },
      _sum: { totalAmount: true },
    }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT LOWER(COALESCE(NULLIF("customerEmail", ''), NULLIF("customerPhone", ''), "customerName"))) AS count
      FROM "Order"
    `,
  ])
  const revenueByEvent = new Map(
    eventRevenue.flatMap((row) => row.eventId ? [[row.eventId, row._sum.totalAmount ?? 0] as const] : []),
  )

  return {
    totalOrders,
    pendingOrders,
    paidOrders,
    completedOrders,
    cancelledOrders,
    totalCustomers: Number(customerCount[0]?.count ?? 0),
    totalPhotos,
    totalEvents,
    revenuePaid: paidAgg._sum.totalAmount ?? 0,
    revenuePending: pendingAgg._sum.totalAmount ?? 0,
    revenueToday: todayAgg._sum.totalAmount ?? 0,
    recentOrders: recent.map(serializeOrder),
    topEvents: events.map((e) => ({
      id: e.id,
      name: e.name,
      photoCount: e._count.photos,
      orderCount: e._count.orders,
      revenue: revenueByEvent.get(e.id) ?? 0,
    })),
  }
}

export type AdminOrderFilters = {
  status?: OrderStatus
  search?: string
  page?: number
  pageSize?: number
  eventId?: string
}

export async function listOrders(filters: AdminOrderFilters = {}) {
  const pageSize = Math.min(filters.pageSize ?? 20, 100)
  const page = Math.max(filters.page ?? 1, 1)
  const search = filters.search?.trim()

  const where = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.eventId ? { eventId: filters.eventId } : {}),
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

type CustomerQueryRow = {
  customerKey: string
  name: string
  email: string | null
  phone: string | null
  orders: bigint
  spent: bigint
  lastOrder: Date
}

export async function listCustomers(options: { search?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(options.page ?? 1, 1)
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 1), 100)
  const search = options.search?.trim()
  const filter = search
    ? Prisma.sql`WHERE name ILIKE ${`%${search}%`} OR email ILIKE ${`%${search}%`} OR phone ILIKE ${`%${search}%`}`
    : Prisma.empty
  const aggregation = Prisma.sql`
    WITH grouped AS (
      SELECT
        LOWER(COALESCE(NULLIF("customerEmail", ''), NULLIF("customerPhone", ''), "customerName")) AS "customerKey",
        (ARRAY_AGG("customerName" ORDER BY "createdAt" DESC))[1] AS name,
        (ARRAY_AGG("customerEmail" ORDER BY "createdAt" DESC))[1] AS email,
        (ARRAY_AGG("customerPhone" ORDER BY "createdAt" DESC))[1] AS phone,
        COUNT(*) AS orders,
        COALESCE(SUM(CASE WHEN status IN ('PAID', 'COMPLETED') THEN "totalAmount" ELSE 0 END), 0) AS spent,
        MAX("createdAt") AS "lastOrder"
      FROM "Order"
      GROUP BY LOWER(COALESCE(NULLIF("customerEmail", ''), NULLIF("customerPhone", ''), "customerName"))
    )
  `
  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<CustomerQueryRow[]>`
      ${aggregation}
      SELECT * FROM grouped
      ${filter}
      ORDER BY "lastOrder" DESC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      ${aggregation}
      SELECT COUNT(*) AS count FROM grouped
      ${filter}
    `,
  ])
  const total = Number(countRows[0]?.count ?? 0)
  return {
    customers: rows.map((row) => ({
      key: row.customerKey,
      name: row.name,
      email: row.email,
      phone: row.phone,
      orders: Number(row.orders),
      spent: Number(row.spent),
      lastOrder: row.lastOrder.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}
