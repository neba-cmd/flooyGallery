import "server-only"
import Stripe from "stripe"
import { env } from "@/lib/env"

let client: Stripe | undefined

export function stripe() {
  client ??= new Stripe(env.stripeSecretKey)
  return client
}

export function createStripeCheckout(input: {
  orderId: string
  orderNumber: string
  amountMinor: number
  currency: string
  customerEmail?: string
  successUrl: string
  cancelUrl: string
  idempotencyKey: string
}) {
  return stripe().checkout.sessions.create({
    mode: "payment",
    client_reference_id: input.orderNumber,
    customer_email: input.customerEmail,
    metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
    payment_intent_data: { metadata: { orderId: input.orderId, orderNumber: input.orderNumber } },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: input.currency.toLowerCase(),
        unit_amount: input.amountMinor,
        product_data: { name: `Flooy Photos ${input.orderNumber}` },
      },
    }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  }, { idempotencyKey: input.idempotencyKey })
}

export function retrieveStripeCheckout(sessionId: string) {
  return stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.latest_charge"],
  })
}
