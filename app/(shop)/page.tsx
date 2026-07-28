import { Suspense } from "react"
import { listPublishedEvents } from "@/lib/services/events"
import { Gallery } from "@/components/gallery/gallery"
import { GalleryHero } from "@/components/gallery/gallery-hero"

// Events and gallery inventory are database-backed and must not be captured at
// build time (deploy previews may build before their database is provisioned).
export const dynamic = "force-dynamic"

export default async function HomePage() {
  const events = await listPublishedEvents()

  return (
    <main>
      <GalleryHero />
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Suspense>
          <Gallery events={events} />
        </Suspense>
      </section>
    </main>
  )
}
