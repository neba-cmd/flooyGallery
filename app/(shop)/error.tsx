"use client"

import { Button } from "@/components/ui/button"

export default function ShopError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">Flooy Photos is temporarily unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We could not load the gallery right now. Your cart is still saved on this device.
      </p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </main>
  )
}
