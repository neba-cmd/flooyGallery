/** Serialized DTOs passed from Server Components / API routes to the client. */

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "COMPLETED" | "CANCELLED"

export interface EventDTO {
  id: string
  name: string
  slug: string
  location: string | null
  date: string | null
  defaultPrice: number
  photoCount?: number
}

export interface PhotoDTO {
  id: string
  eventId: string
  eventName?: string
  filename: string
  photoNumber: number | null
  photographer: string | null
  previewUrl: string
  width: number | null
  height: number | null
  fileSize: number | null
  price: number
  takenAt: string | null
  createdAt: string
}

export interface CartItem {
  photoId: string
  filename: string
  photoNumber: number | null
  previewUrl: string
  price: number
  eventId: string
  eventName?: string
}

export interface OrderItemDTO {
  id: string
  photoId: string
  unitPrice: number
  photo: PhotoDTO
}

export interface OrderDTO {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  status: OrderStatus
  totalAmount: number
  eventName: string | null
  itemCount: number
  createdAt: string
  paidAt: string | null
  completedAt: string | null
  items?: OrderItemDTO[]
}

export interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  total?: number
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}
