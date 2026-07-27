/**
 * Lightweight in-memory fixed-window rate limiter.
 *
 * Sufficient for single-instance protection and abuse dampening. For true
 * multi-instance limits (the target scale of thousands of concurrent
 * visitors), swap the Map for Upstash Redis behind this same interface — no
 * caller changes required.
 */
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt }
  }

  bucket.count += 1
  const success = bucket.count <= limit
  return { success, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt }
}

export function clientKey(request: Request, scope: string): string {
  const fwd = request.headers.get("x-forwarded-for")
  const ip = fwd?.split(",")[0]?.trim() || "unknown"
  return `${scope}:${ip}`
}

// Opportunistic cleanup to bound memory growth.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }, 60_000).unref?.()
}
