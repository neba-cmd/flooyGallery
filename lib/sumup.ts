import "server-only"
import { env } from "@/lib/env"

const API_BASE = "https://api.sumup.com"

export type SumUpCheckoutStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED"

export type SumUpTransaction = {
  id?: string
  status?: "SUCCESSFUL" | "CANCELLED" | "FAILED" | "PENDING" | "REFUNDED"
  amount?: number
  currency?: string
  merchant_code?: string
}

export type SumUpCheckout = {
  id: string
  checkout_reference: string
  amount: number
  currency: string
  merchant_code: string
  status: SumUpCheckoutStatus
  hosted_checkout_url?: string
  transactions?: SumUpTransaction[]
}

async function sumupRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.sumupApiKey}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id")
    throw new Error(`SumUp request failed (${response.status}${requestId ? `, ${requestId}` : ""})`)
  }
  return response.json() as Promise<T>
}

export function createSumUpCheckout(input: {
  amountPence: number
  currency: string
  reference: string
  description: string
  redirectUrl: string
  webhookUrl: string
}) {
  return sumupRequest<SumUpCheckout>("/v0.1/checkouts", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountPence / 100,
      currency: input.currency,
      checkout_reference: input.reference,
      merchant_code: env.sumupMerchantCode,
      description: input.description,
      redirect_url: input.redirectUrl,
      return_url: input.webhookUrl,
      hosted_checkout: { enabled: true },
    }),
  })
}

export function retrieveSumUpCheckout(checkoutId: string) {
  return sumupRequest<SumUpCheckout>(`/v0.1/checkouts/${encodeURIComponent(checkoutId)}`)
}

export function listSumUpCheckouts(reference: string) {
  return sumupRequest<SumUpCheckout[]>(`/v0.1/checkouts?checkout_reference=${encodeURIComponent(reference)}`)
}
