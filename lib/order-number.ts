import { prisma } from "@/lib/db"

/**
 * Generates a human-friendly, collision-checked order number such as
 * FLOOY-48372. Staff read these aloud at the payment desk, so we keep them
 * short (5 digits) and retry on the rare collision.
 */
export async function generateOrderNumber(maxAttempts = 8): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const digits = Math.floor(10000 + Math.random() * 90000) // 10000-99999
    const candidate = `FLOOY-${digits}`
    const existing = await prisma.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
  }
  // Extremely unlikely fallback: widen the space with a timestamp suffix.
  return `FLOOY-${Date.now().toString().slice(-7)}`
}
