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

const EVENTS = [
  {
    name: "City Marathon 2026",
    slug: "city-marathon-2026",
    location: "London, UK",
    date: new Date("2026-04-19T08:00:00Z"),
    defaultPrice: 1500,
    count: 40,
  },
  {
    name: "Summer Music Festival",
    slug: "summer-music-festival-2026",
    location: "Manchester, UK",
    date: new Date("2026-07-11T14:00:00Z"),
    defaultPrice: 1200,
    count: 32,
  },
  {
    name: "Tech Summit 2026",
    slug: "tech-summit-2026",
    location: "Bristol, UK",
    date: new Date("2026-09-03T09:00:00Z"),
    defaultPrice: 2000,
    count: 24,
  },
]

// A few plausible preview dimensions so the masonry layout looks natural.
const SIZES = [
  { width: 1600, height: 1067 },
  { width: 1067, height: 1600 },
  { width: 1600, height: 1200 },
  { width: 1600, height: 900 },
  { width: 1200, height: 1500 },
]

async function main() {
  console.log("[seed] Seeding Flooy Photos demo data...")
  let running = 1

  for (const spec of EVENTS) {
    const event = await prisma.event.upsert({
      where: { slug: spec.slug },
      update: {},
      create: {
        name: spec.name,
        slug: spec.slug,
        location: spec.location,
        description:
          "Official event gallery. Browse watermarked previews, add your favourites to the cart, then pay at the Flooy Photo Desk to unlock full-resolution downloads.",
        date: spec.date,
        defaultPrice: spec.defaultPrice,
        published: true,
      },
    })

    const existing = await prisma.photo.count({ where: { eventId: event.id } })
    if (existing > 0) {
      console.log(`[seed] "${spec.name}" already has ${existing} photos, skipping.`)
      running += spec.count
      continue
    }

    const rows = Array.from({ length: spec.count }).map((_, i) => {
      const demo = DEMO[(i + spec.slug.length) % DEMO.length]
      const size = SIZES[i % SIZES.length]
      const number = running + i
      const filename = `FLOOY_${String(number).padStart(4, "0")}.jpg`
      return {
        eventId: event.id,
        filename,
        photoNumber: number,
        photographer: demo.photographer,
        previewKey: `events/${event.id}/previews/${filename}`,
        originalKey: `events/${event.id}/originals/${filename}`,
        previewUrl: `/demo/${demo.file}`,
        width: size.width,
        height: size.height,
        fileSize: 5_600_000 + number * 1000,
        takenAt: new Date(spec.date.getTime() + i * 47_000),
      }
    })

    await prisma.photo.createMany({ data: rows })
    running += spec.count
    console.log(`[seed] Created "${spec.name}" with ${spec.count} demo photos.`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
