"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Download, Loader2, MapPin, Copy, Check } from "lucide-react"
import type { PublicOrderDTO } from "@/types"
import { Button } from "@/components/ui/button"
import { formatPrice, formatDateTime } from "@/lib/format"
import { ORDER_STATUS } from "@/lib/order-status"
import { cn } from "@/lib/utils"
import { SafeImage } from "@/components/safe-image"

export function OrderStatusView({ order }: { order: PublicOrderDTO }) {
  const status = ORDER_STATUS[order.status]
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleDownload(itemId: string, filename: string) {
    setDownloadingId(itemId)
    try {
      const res = await fetch(`/api/orders/${order.orderNumber}/download/${itemId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Could not generate download link")
      // Signed URL — open in a new tab to trigger the download.
      const a = document.createElement("a")
      a.href = data.url
      a.download = filename
      a.rel = "noopener"
      a.target = "_blank"
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed")
    } finally {
      setDownloadingId(null)
    }
  }

  function copyNumber() {
    navigator.clipboard.writeText(order.orderNumber).then(() => {
      setCopied(true)
      toast.success("Order number copied")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div>
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Order number</p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="font-mono text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 rounded-full text-muted-foreground"
                onClick={copyNumber}
                aria-label="Copy order number"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium",
              status.badgeClass,
            )}
          >
            {status.label}
          </span>
        </div>

        <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
          {status.description}
        </p>

        {order.status === "PENDING_PAYMENT" && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-accent p-4">
            <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium text-accent-foreground">Pay at the Flooy Photo Desk</p>
              <p className="mt-1 text-muted-foreground">
                Show order <span className="font-mono font-medium">{order.orderNumber}</span> to a
                member of staff. Once payment is confirmed, your downloads unlock instantly on this
                page.
              </p>
            </div>
          </div>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="mt-1 font-medium">{order.customerName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Photos</dt>
            <dd className="mt-1 font-medium">{order.itemCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="mt-1 font-medium">{formatPrice(order.totalAmount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Placed</dt>
            <dd className="mt-1 font-medium">{formatDateTime(order.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <h2 className="mt-8 mb-4 text-lg font-semibold">Your photos</h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {order.items?.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative aspect-square">
              <SafeImage
                src={item.photo.previewUrl || "/placeholder.svg"}
                alt={item.photo.filename}
                fill
                sizes="240px"
                className="object-cover"
              />
            </div>
            <div className="p-3">
              <p className="truncate font-mono text-xs text-muted-foreground">#{item.photo.photoNumber}</p>
              {status.downloadable ? (
                <Button
                  size="sm"
                  className="mt-2 w-full rounded-full"
                  onClick={() => handleDownload(item.id, item.photo.filename)}
                  disabled={downloadingId === item.id}
                >
                  {downloadingId === item.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Download
                </Button>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Locked until paid</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
