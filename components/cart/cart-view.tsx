"use client"

import Link from "next/link"
import { ArrowRight, Trash2, ImageOff, Users, Check } from "lucide-react"
import { useCart } from "@/components/cart/cart-provider"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"
import { SafeImage } from "@/components/safe-image"
import { PricingSummary } from "@/components/checkout/pricing-summary"

export function CartView() {
  const { items, removeItem, clear, total, originalTotal, discount, bundleCount, count } = useCart()

  if (count === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card px-6 py-16 text-center">
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-muted">
            <ImageOff className="size-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-balance">Your selection is empty</h1>
          <p className="mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
            Browse the gallery and tap Add on any photo to build your selection.
          </p>
          <Button className="mt-6 rounded-full" render={<Link href="/" />}>
            Browse photos
          </Button>
        </div>
        <TeamPackageCard />
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your selection</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {count} {count === 1 ? "photo" : "photos"} selected
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={clear}
          >
            Clear all
          </Button>
        </div>

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.photoId}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative aspect-square">
                <SafeImage
                  src={item.previewUrl || "/placeholder.svg"}
                  alt={item.filename}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    #{item.photoNumber}
                  </p>
                  <p className="text-sm font-medium">{formatPrice(item.price)}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.photoId)}
                  aria-label={`Remove photo ${item.photoNumber}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="mt-5">
            <PricingSummary
              count={count}
              originalTotal={originalTotal}
              discount={discount}
              total={total}
              bundleCount={bundleCount}
            />
          </div>
          <Button className="mt-6 w-full rounded-full" render={<Link href="/checkout" />}>
            Proceed to checkout
            <ArrowRight className="size-4" />
          </Button>
          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            No payment is taken online. Create an order number, then call +44 7403 302773 or
            +44 7554 040886 to arrange cash payment.
          </p>
        </div>
      </aside>
      <div className="lg:col-span-2">
        <TeamPackageCard />
      </div>
    </div>
  )
}

function TeamPackageCard() {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-7">
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Separate package</p>
              <h2 className="text-xl font-semibold">Team Package</h2>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">20 professionally selected team photos</p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            {["Action shots", "Team moments", "Group photos"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="sm:text-right">
          <p className="text-3xl font-semibold tracking-tight">£75</p>
          <Button className="mt-3 w-full rounded-full sm:w-auto" render={<Link href="/checkout?product=team-package" />}>
            Choose package
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
