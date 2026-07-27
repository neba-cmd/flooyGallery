"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export function OrderLookup() {
  const router = useRouter()
  const [value, setValue] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim().toUpperCase()
    if (!trimmed) return
    router.push(`/orders/${encodeURIComponent(trimmed)}`)
  }

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. FLOOY-48372"
            aria-label="Order number"
            className="h-12 rounded-xl font-mono text-base uppercase"
            autoCapitalize="characters"
            autoComplete="off"
          />
          <Button type="submit" size="lg" className="h-12 gap-2 rounded-xl">
            <Search className="size-4" />
            Find order
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
