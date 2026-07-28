"use client"

import { Button } from "@/components/ui/button"

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <h1 className="text-xl font-semibold">Admin data could not be loaded</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The database or another required service may be temporarily unavailable.
      </p>
      <Button className="mt-5" onClick={reset}>Try again</Button>
    </div>
  )
}
