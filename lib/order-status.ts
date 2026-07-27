import type { OrderStatus } from "@/types"

type StatusConfig = {
  label: string
  description: string
  /** Tailwind classes for the badge */
  badgeClass: string
  /** Whether purchased downloads are available in this state */
  downloadable: boolean
}

export const ORDER_STATUS: Record<OrderStatus, StatusConfig> = {
  PENDING_PAYMENT: {
    label: "Pending Payment",
    description: "Visit the Flooy Photo Desk with your order number to complete payment.",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    downloadable: false,
  },
  PAID: {
    label: "Paid",
    description: "Payment confirmed. Your high-resolution downloads are ready below.",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    downloadable: true,
  },
  COMPLETED: {
    label: "Completed",
    description: "This order is complete. Your downloads remain available below.",
    badgeClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    downloadable: true,
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This order was cancelled. Please speak to a member of staff if this is unexpected.",
    badgeClass: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    downloadable: false,
  },
}

export const ORDER_STATUS_LIST: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "COMPLETED",
  "CANCELLED",
]
