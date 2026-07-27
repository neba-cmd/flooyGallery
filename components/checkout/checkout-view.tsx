"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useCart } from "@/components/cart/cart-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPrice } from "@/lib/format"

export function CheckoutView() {
  const router = useRouter()
  const { items, total, count, clear } = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (count === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Nothing to check out</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add some photos to your selection first.</p>
        <Button className="mt-6 rounded-full" render={<Link href="/" />}>
          Browse photos
        </Button>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    const form = new FormData(e.currentTarget)
    const name = String(form.get("name") ?? "").trim()
    const email = String(form.get("email") ?? "").trim()
    const phone = String(form.get("phone") ?? "").trim()

    if (name.length < 2) {
      setErrors({ name: "Please enter your full name" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, photoIds: items.map((i) => i.photoId) }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Checkout failed")
      }
      clear()
      router.push(`/orders/${data.order.orderNumber}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed")
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirm your details below. We&apos;ll generate an order number to pay at the desk.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <form onSubmit={handleSubmit} noValidate className="rounded-3xl border border-border bg-card p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input id="name" name="name" autoComplete="name" placeholder="Jane Smith" required />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="jane@example.com" />
              <p className="text-xs text-muted-foreground">
                We can email your download link once payment is confirmed.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="07123 456789" />
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full rounded-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating order...
              </>
            ) : (
              "Generate order number"
            )}
          </Button>
          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            No online payment is taken. Present your order number at the Flooy Photo Desk to pay and
            unlock downloads.
          </p>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {count} {count === 1 ? "photo" : "photos"}
            </h2>
            <ul className="mt-4 grid grid-cols-4 gap-2">
              {items.slice(0, 8).map((item) => (
                <li key={item.photoId} className="relative aspect-square overflow-hidden rounded-lg">
                  <Image
                    src={item.previewUrl || "/placeholder.svg"}
                    alt=""
                    fill
                    sizes="60px"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
            {count > 8 && (
              <p className="mt-2 text-xs text-muted-foreground">+{count - 8} more</p>
            )}
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-semibold">{formatPrice(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
