"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CheckCircle2, CircleAlert, Loader2, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { OrderStatus } from "@/types"

export function PaymentCompleteView({ orderNumber, accessToken }: { orderNumber: string; accessToken: string }) {
  const [status, setStatus] = useState<OrderStatus>("PENDING_PAYMENT")
  const [finishedPolling, setFinishedPolling] = useState(false)
  const [downloadStarted, setDownloadStarted] = useState(false)
  const autoDownloadStarted = useRef(false)

  const startDownload = useCallback(() => {
    const a = document.createElement("a")
    a.href = `/api/orders/${encodeURIComponent(orderNumber)}/download?access=${encodeURIComponent(accessToken)}`
    a.download = `${orderNumber}-photos.zip`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setDownloadStarted(true)
  }, [accessToken, orderNumber])

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    async function check() {
      attempts += 1
      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(orderNumber)}/payment-status?access=${encodeURIComponent(accessToken)}`,
          { cache: "no-store" },
        )
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        if (cancelled) return
        setStatus(data.status)
        if (["PAID", "COMPLETED", "REFUNDED", "FAILED", "EXPIRED"].includes(data.status)) return
      } catch {
        // A transient Stripe/network failure is represented as pending while we retry.
      }
      if (!cancelled && attempts < 10) window.setTimeout(check, 3000)
      else if (!cancelled) setFinishedPolling(true)
    }
    void check()
    return () => { cancelled = true }
  }, [accessToken, orderNumber])

  const paid = status === "PAID" || status === "COMPLETED"
  const failed = status === "FAILED" || status === "EXPIRED" || status === "REFUNDED"

  useEffect(() => {
    if (!paid || autoDownloadStarted.current) return
    autoDownloadStarted.current = true
    const key = `flooy-auto-download-${orderNumber}`
    if (window.sessionStorage.getItem(key)) return
    window.sessionStorage.setItem(key, "started")
    const timer = window.setTimeout(startDownload, 0)
    return () => window.clearTimeout(timer)
  }, [orderNumber, paid, startDownload])

  return (
    <section className="w-full rounded-3xl border border-border bg-card p-7 text-center sm:p-10" aria-live="polite">
      {paid ? <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        : failed ? <CircleAlert className="mx-auto size-12 text-destructive" />
          : finishedPolling ? <Clock3 className="mx-auto size-12 text-amber-500" />
            : <Loader2 className="mx-auto size-12 animate-spin text-primary" />}
      <h1 className="mt-5 text-2xl font-semibold">
        {paid ? "Payment confirmed" : failed ? "Payment not completed" : finishedPolling ? "Payment is still pending" : "Checking your payment"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {paid ? downloadStarted
          ? "Your purchased originals are downloading together as one ZIP file."
          : "Your purchased originals are unlocked and ready to download."
          : failed ? "Stripe did not confirm this payment. Your photos remain locked."
            : "We’re securely confirming the payment with Stripe. This can take a few moments."}
      </p>
      {paid ? (
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button className="w-full rounded-full" onClick={startDownload}>
            Download all photos
          </Button>
          <Button className="w-full rounded-full" variant="outline" render={<Link href={`/orders/${orderNumber}`} />}>
            View order
          </Button>
        </div>
      ) : (
        <Button className="mt-7 w-full rounded-full" render={<Link href={`/orders/${orderNumber}`} />}>
          View order
        </Button>
      )}
    </section>
  )
}
