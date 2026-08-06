import "server-only"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { retrieveSumUpCheckout } from "@/lib/sumup"

function majorToMinor(amount: number): number | null {
  const minor = Math.round(amount * 100)
  return Number.isFinite(amount) && Math.abs(amount * 100 - minor) < 1e-6 ? minor : null
}

export async function verifyAndSyncSumUpCheckout(checkoutId: string) {
  const order = await prisma.order.findUnique({ where: { sumupCheckoutId: checkoutId } })
  if (!order) return null

  const checkout = await retrieveSumUpCheckout(checkoutId)
  const successful = checkout.transactions?.some((transaction) =>
    transaction.status === "SUCCESSFUL" &&
    transaction.merchant_code === env.sumupMerchantCode &&
    transaction.currency === order.currency &&
    majorToMinor(transaction.amount ?? Number.NaN) === order.totalAmount,
  ) ?? false
  const refunded = checkout.transactions?.some((transaction) =>
    transaction.status === "REFUNDED" &&
    transaction.merchant_code === env.sumupMerchantCode &&
    transaction.currency === order.currency &&
    majorToMinor(transaction.amount ?? Number.NaN) === order.totalAmount,
  ) ?? false
  const identityMatches =
    checkout.id === order.sumupCheckoutId &&
    checkout.checkout_reference === order.checkoutReference &&
    checkout.merchant_code === env.sumupMerchantCode &&
    checkout.currency === order.currency &&
    majorToMinor(checkout.amount) === order.totalAmount

  if (!identityMatches) {
    console.error("[sumup] Checkout verification mismatch", { orderId: order.id, checkoutId })
    throw new Error("Payment verification failed")
  }

  const nextStatus = refunded
    ? "REFUNDED"
    : checkout.status === "PAID" && successful
    ? "PAID"
    : checkout.status === "FAILED" ? "FAILED"
      : checkout.status === "EXPIRED" ? "EXPIRED" : "PENDING_PAYMENT"

  // PAID is terminal here: delayed/duplicate notifications cannot relock a
  // fulfilled order. updateMany makes concurrent webhook/redirect checks safe.
  if (refunded || (order.status !== "PAID" && order.status !== "COMPLETED" && order.status !== "REFUNDED")) {
    await prisma.order.updateMany({
      where: { id: order.id, status: order.status },
      data: {
        status: nextStatus,
        ...(nextStatus === "PAID"
          ? { paidAt: order.paidAt ?? new Date(), paymentVerifiedAt: new Date() }
          : nextStatus === "REFUNDED" ? { refundedAt: order.refundedAt ?? new Date() } : {}),
      },
    })
  }
  return prisma.order.findUniqueOrThrow({ where: { id: order.id } })
}
