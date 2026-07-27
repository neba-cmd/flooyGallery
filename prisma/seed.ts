import "dotenv/config"
import { PrismaClient } from "../lib/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

// Demo preview assets bundled in /public so the gallery renders before R2 is
// configured. In production these URLs are Cloudflare R2 preview URLs.
const DEMO = [
  { file: "marathon-01.png", photographer: "Sam Rivera" },
  { file: "graduation-01.png", photographer: "Priya Shah" },
  { file: "conference-01.png", photographer: "Marcus Lee" },
  { file: "festival-01.png", photographer: "Sam Rivera" },
  { file: "football-01.png", photographer: "Jordan Blake" },
  { file: "exhibition-01.png", photographer: "Priya Shah" },
]

async function main() {
  console.log("[seed] Seeding Flooy Photos demo data...")

  const event = await prisma.event.upsert({
    where: { slug: "city-marathon-2026" },
    update: {},
    create: {
      name: "City Marathon 2026",
      slug: "city-marathon-2026",
      location: "London, UK",
      description:
        "Official event gallery. Browse watermarked previews, add your favourites to the cart, then pay at the Flooy Photo Desk to unlock full-resolution downloads.",
      date: new Date("2026-04-19T08:00:00Z"),
      defaultPrice: 1500,
      published: true,
    },
  })

  const existing = await prisma.photo.count({ where: { eventId: event.id } })
  if (existing > 0) {
    console.log(`[seed] Event already has ${existing} photos, skipping photo seed.`)
    return
  }

  const TOTAL = 60
  const rows = Array.from({ length: TOTAL }).map((_, i) => {
    const demo = DEMO[i % DEMO.length]
    const number = i + 1
    const filename = `FLOOY_${String(number).padStart(4, "0")}.jpg`
    return {
      eventId: event.id,
      filename,
      photoNumber: number,
      photographer: demo.photographer,
      previewKey: `events/${event.id}/previews/${filename}`,
      originalKey: `events/${event.id}/originals/${filename}`,
      previewUrl: `/demo/${demo.file}`,
      width: 1600,
      height: 1067,
      fileSize: 5_600_000 + number * 1000,
      takenAt: new Date(`2026-04-19T${String(8 + (i % 6)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00Z`),
    }
  })

  await prisma.photo.createMany({ data: rows })
  console.log(`[seed] Created event "${event.name}" with ${TOTAL} demo photos.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
