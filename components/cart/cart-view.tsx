"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Trash2, ImageOff } from "lucide-react"
import { useCart } from "@/components/cart/cart-provider"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"

export function CartView() {
  const { items, removeItem, clear, total, count } = useCart()

  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card px-6 py-20 text-center">
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-muted">
          <ImageOff className="size-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold text-balance">Your selection is empty</h1>
        <p className="mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
          Browse the event gallery and tap the plus icon on any photo to add it to your selection.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/">Browse photos</Link>
        </Button>
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
              key={item.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative aspect-square">
                <Image
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
                  onClick={() => removeItem(item.id)}
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
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Photos</dt>
              <dd className="font-medium">{count}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-base">
              <dt className="font-medium">Total</dt>
              <dd className="font-semibold">{formatPrice(total)}</dd>
            </div>
          </dl>
          <Button asChild className="mt-6 w-full rounded-full">
            <Link href="/checkout">
              Proceed to checkout
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            No payment is taken online. You&apos;ll receive an order number to pay at the Flooy Photo
            Desk.
          </p>
        </div>
      </aside>
    </div>
  )
}
