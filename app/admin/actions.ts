"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/session"
import { updateOrderStatus } from "@/lib/services/orders"
import type { OrderStatus } from "@/types"

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
