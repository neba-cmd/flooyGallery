import { BadgeCheck } from "lucide-react"
import { formatPrice } from "@/lib/format"

type PricingSummaryProps = {
  count: number
  originalTotal: number
  discount: number
  total: number
  bundleCount: number
}

export function PricingSummary({
  count,
  originalTotal,
  discount,
  total,
  bundleCount,
}: PricingSummaryProps) {
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-4">
        <dt className="text-muted-foreground">Selected photos</dt>
        <dd className="font-medium tabular-nums">{count}</dd>
      </div>
      <div className="flex items-center justify-between gap-4">
        <dt className="text-muted-foreground">Original total</dt>
        <dd className={discount > 0 ? "text-muted-foreground line-through" : "font-medium"}>
          {formatPrice(originalTotal)}
        </dd>
      </div>
      {discount > 0 && (
        <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400">
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-start gap-2 font-medium">
              <BadgeCheck className="mt-0.5 size-4 shrink-0" />
              <span>
                5-photo bundle
                {bundleCount > 1 && <span className="block text-xs font-normal">× {bundleCount}</span>}
              </span>
            </dt>
            <dd className="shrink-0 font-semibold">−{formatPrice(discount)}</dd>
          </div>
        </div>
      )}
      <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
        <dt className="font-semibold">Total</dt>
        <dd className="text-2xl font-semibold tracking-tight tabular-nums">{formatPrice(total)}</dd>
      </div>
    </dl>
  )
}
