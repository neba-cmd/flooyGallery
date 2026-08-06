import "server-only"
import Stripe from "stripe"
import { prisma } from "@/lib/db"
import { retrieveStripeCheckout } from "@/lib/stripe"

function paymentIntentId(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null
}

function isRefunded(session: Stripe.Checkout.Session) {
  const intent = typeof session.payment_intent === "object" ? session.payment_intent : null
  const charge = intent && typeof intent.latest_charge === "object" ? intent.latest_charge : null
  return Boolean(charge && charge.amount_refunded >= (session.amount_total ?? Number.MAX_SAFE_INTEGER))
}

export async function verifyAndSyncStripeCheckout(sessionId: string, providerEvent?: "FAILED") {
  const order = await prisma.order.findUnique({ where: { stripeSessionId: sessionId } })
  if (!order) return null

  const session = await retrieveStripeCheckout(sessionId)
  const identityMatches =
    session.id === order.stripeSessionId &&
    session.client_reference_id === order.orderNumber &&
    session.metadata?.orderId === order.id &&
    session.currency?.toUpperCase() === order.currency &&
    session.amount_total === order.totalAmount

  if (!identityMatches) {
    console.error("[stripe] Checkout verification mismatch", { orderId: order.id, sessionId })
    throw new Error("Payment verification failed")
  }

  const refunded = isRefunded(session)
  const nextStatus = refunded
    ? "REFUNDED"
    : session.payment_status === "paid"
      ? "PAID"
      : providerEvent === "FAILED"
        ? "FAILED"
        : session.status === "expired"
          ? "EXPIRED"
          : "PENDING_PAYMENT"

  if (refunded || !["PAID", "COMPLETED", "REFUNDED"].includes(order.status)) {
    await prisma.order.updateMany({
      where: { id: order.id, status: order.status },
      data: {
        status: nextStatus,
        stripePaymentIntentId: paymentIntentId(session),
        ...(nextStatus === "PAID"
          ? { paidAt: order.paidAt ?? new Date(), paymentVerifiedAt: new Date() }
          : nextStatus === "REFUNDED" ? { refundedAt: order.refundedAt ?? new Date() } : {}),
      },
    })
  }
  return prisma.order.findUniqueOrThrow({ where: { id: order.id } })
}
