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
  const [contact, setContact] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim().toUpperCase()
    if (!trimmed || !contact.trim()) return
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: trimmed, contact }),
      })
      const data: unknown = await response.json()
      if (!response.ok || typeof data !== "object" || data === null || !("url" in data)) {
        const message =
          typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
            ? data.error
            : "Order lookup failed"
        throw new Error(message)
      }
      router.push(String(data.url))
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Order lookup failed")
      setLoading(false)
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-6">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. FLOOY-48372"
            aria-label="Order number"
            className="h-12 rounded-xl font-mono text-base uppercase"
            autoCapitalize="characters"
            autoComplete="off"
          />
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email address or phone used at checkout"
            aria-label="Email address or phone"
            autoComplete="email"
            className="h-12 rounded-xl"
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="h-12 gap-2 rounded-xl" disabled={loading}>
            <Search className="size-4" />
            {loading ? "Checking…" : "Find order"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
