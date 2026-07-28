import "dotenv/config"
import { hashPassword } from "better-auth/crypto"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../lib/generated/prisma/client.js"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password || password.length < 8) {
    throw new Error("Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 8 characters")
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  })
  if (!user || user.role !== "admin") throw new Error("Admin account not found")

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  })
  if (!account) throw new Error("Credential account not found")

  await prisma.account.update({
    where: { id: account.id },
    data: { password: await hashPassword(password) },
  })
  await prisma.session.deleteMany({ where: { userId: user.id } })
  console.log(`Reset password and revoked sessions for admin: ${email}`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Admin password reset failed")
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
