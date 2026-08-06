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
    description: "Pay in cash, then our team will unlock your downloads.",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    downloadable: false,
  },
  PAID: {
    label: "Paid",
    description: "Payment confirmed. Your high-resolution downloads are ready below.",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    downloadable: true,
  },
  FAILED: {
    label: "Payment Failed",
    description: "The payment was not completed. Your originals remain locked.",
    badgeClass: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    downloadable: false,
  },
  EXPIRED: {
    label: "Expired",
    description: "This payment session expired. Your originals remain locked.",
    badgeClass: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
    downloadable: false,
  },
  COMPLETED: {
    label: "Completed",
    description: "This order is complete. Your downloads remain available below.",
    badgeClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    downloadable: true,
  },
  REFUNDED: {
    label: "Refunded",
    description: "This order was refunded. Downloads are no longer available.",
    badgeClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
    downloadable: false,
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
  "FAILED",
  "EXPIRED",
  "COMPLETED",
  "REFUNDED",
  "CANCELLED",
]
