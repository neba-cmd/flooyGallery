"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Check, Loader2, Users } from "lucide-react"
import { useCart } from "@/components/cart/cart-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPrice } from "@/lib/format"
import { SafeImage } from "@/components/safe-image"
import { PricingSummary } from "@/components/checkout/pricing-summary"
import { TEAM_PACKAGE_PRICE } from "@/lib/pricing"

export function CheckoutView({ productType }: { productType: "PHOTOS" | "TEAM_PACKAGE" }) {
  const { items, total, originalTotal, discount, bundleCount, count } = useCart()
  const isTeamPackage = productType === "TEAM_PACKAGE"
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const checkoutKey = useRef<string | null>(null)

  if (!isTeamPackage && count === 0) {
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
    if (submitting) return
    setErrors({})
    const form = new FormData(e.currentTarget)
    const name = String(form.get("name") ?? "").trim()
    const email = String(form.get("email") ?? "").trim()
    const phone = String(form.get("phone") ?? "").trim()

    if (name.length < 2) {
      setErrors({ name: "Please enter your full name" })
      return
    }
    if (!email && !phone) {
      setErrors({ contact: "Enter an email address or phone number so you can securely retrieve the order." })
      return
    }
    const phoneDigits = phone.replace(/\D/g, "")
    if (phone && (phoneDigits.length < 8 || phoneDigits.length > 15)) {
      setErrors({ contact: "Enter a valid phone number." })
      return
    }

    setSubmitting(true)
    checkoutKey.current ??= crypto.randomUUID()
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          productType,
          ...(isTeamPackage ? {} : { photoIds: items.map((i) => i.photoId) }),
          checkoutKey: checkoutKey.current,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Checkout failed")
      }
      if (!data.hostedCheckoutUrl) throw new Error("Payment page is unavailable")
      window.location.assign(data.hostedCheckoutUrl)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed")
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirm your details below, then continue to Stripe&apos;s secure payment page.
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
                Email
              </Label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="jane@example.com" />
              <p className="text-xs text-muted-foreground">
                We can email your download link once payment is confirmed.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone
              </Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="Phone number" />
              {errors.contact && <p role="alert" className="text-xs text-destructive">{errors.contact}</p>}
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full rounded-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Opening secure payment...
              </>
            ) : (
              "Pay securely with Stripe"
            )}
          </Button>
          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Prices are verified by the server. Downloads unlock only after Stripe confirms payment.
          </p>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-6">
            {isTeamPackage ? (
              <TeamPackageSummary />
            ) : (
              <>
                <h2 className="text-lg font-semibold">Order summary</h2>
                <ul className="mt-4 grid grid-cols-4 gap-2">
                  {items.slice(0, 8).map((item) => (
                    <li key={item.photoId} className="relative aspect-square overflow-hidden rounded-lg">
                      <SafeImage
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
                <div className="mt-5 border-t border-border pt-4">
                  <PricingSummary
                    count={count}
                    originalTotal={originalTotal}
                    discount={discount}
                    total={total}
                    bundleCount={bundleCount}
                  />
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function TeamPackageSummary() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Team Package</h2>
          <p className="text-sm text-muted-foreground">20 Team Photos</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
        {["Action shots", "Team moments", "Group photos"].map((item) => (
          <li key={item} className="flex items-center gap-2 text-muted-foreground">
            <Check className="size-4 text-primary" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
        <span className="font-semibold">Total</span>
        <span className="text-2xl font-semibold tracking-tight">
          {formatPrice(TEAM_PACKAGE_PRICE, "GBP")}
        </span>
      </div>
    </div>
  )
}
