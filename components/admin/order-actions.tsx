"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { setOrderStatusAction } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import type { OrderStatus } from "@/types"

const actions: Record<OrderStatus, Array<{ status: OrderStatus; label: string; destructive?: boolean }>> = {
  PENDING_PAYMENT: [{ status: "PAID", label: "Mark paid" }, { status: "CANCELLED", label: "Cancel", destructive: true }],
  PAID: [{ status: "COMPLETED", label: "Complete" }, { status: "REFUNDED", label: "Refund", destructive: true }],
  FAILED: [],
  EXPIRED: [],
  COMPLETED: [{ status: "PAID", label: "Reopen" }, { status: "REFUNDED", label: "Refund", destructive: true }],
  REFUNDED: [],
  CANCELLED: [{ status: "PENDING_PAYMENT", label: "Restore" }],
}

export function OrderActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [pending, startTransition] = useTransition()
  const [current, setCurrent] = useState(status)
  return <div className="flex flex-wrap gap-2">
    {actions[current].map((action) => (
      <Button key={action.status} size="sm" variant={action.destructive ? "destructive" : "outline"} disabled={pending}
        onClick={() => {
          if (action.destructive) {
            const message = action.status === "REFUNDED"
              ? "Mark this order as refunded? This records the refund and locks customer downloads."
              : "Cancel this order? Downloads will be locked."
            if (!window.confirm(message)) return
          }
          startTransition(async () => {
            try {
              const order = await setOrderStatusAction(orderId, action.status)
              setCurrent(order.status)
              toast.success(action.status === "REFUNDED" ? "Order marked as refunded" : `Order updated to ${action.label.toLowerCase()}`)
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not update order")
            }
          })
        }}>{action.label}</Button>
    ))}
  </div>
}
