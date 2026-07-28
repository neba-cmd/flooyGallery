import { PrismaClient } from "@/lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { env } from "@/lib/env"

// Prisma 7 requires a driver adapter. We use the pooled Neon connection
// (DATABASE_URL) at runtime; the Prisma CLI uses the direct connection.
function runtimeConnectionString(value: string): string {
  const url = new URL(value)
  // pg 8 treats "require" as full certificate verification but warns that
  // pg 9 will change its meaning. Preserve today's secure behavior explicitly.
  if (url.searchParams.get("sslmode") === "require") {
    url.searchParams.set("sslmode", "verify-full")
  }
  return url.toString()
}

const connectionString = runtimeConnectionString(env.databaseUrl)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaPool: Pool | undefined
}

function createPrismaClient() {
  // A serverless instance must not create pg's default ten-connection pool.
  // Neon supplies the external pooler; one connection per warm function keeps
  // bursts from exhausting the database role's connection allowance.
  const pool =
    globalForPrisma.prismaPool ??
    new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000,
    })
  const adapter = new PrismaPg(pool)
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPool = pool
  }
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
