import { NextResponse, type NextRequest } from "next/server"
import { env } from "@/lib/env"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { verifyAndSyncStripeCheckout } from "@/lib/services/payments"

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature")
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 })

  let event
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, env.stripeWebhookSecret)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.expired":
        await verifyAndSyncStripeCheckout(event.data.object.id)
        break
      case "checkout.session.async_payment_failed":
        await verifyAndSyncStripeCheckout(event.data.object.id, "FAILED")
        break
      case "charge.refunded": {
        const paymentIntentId = typeof event.data.object.payment_intent === "string"
          ? event.data.object.payment_intent
          : event.data.object.payment_intent?.id
        if (paymentIntentId) {
          const order = await prisma.order.findUnique({ where: { stripePaymentIntentId: paymentIntentId } })
          if (order?.stripeSessionId) await verifyAndSyncStripeCheckout(order.stripeSessionId)
        }
        break
      }
    }
  } catch (error) {
    console.error("[stripe-webhook] Verification failed", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
