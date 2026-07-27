import { Suspense } from "react"
import { listPublishedEvents } from "@/lib/services/events"
import { listPhotographers } from "@/lib/services/photos"
import { Gallery } from "@/components/gallery/gallery"
import { GalleryHero } from "@/components/gallery/gallery-hero"

// Revalidate the shell periodically; the gallery itself streams live via SWR.
export const revalidate = 60

export default async function HomePage() {
  const [events, photographers] = await Promise.all([listPublishedEvents(), listPhotographers()])
  const totalPhotos = events.reduce((sum, e) => sum + (e.photoCount ?? 0), 0)

  return (
    <main>
      <GalleryHero eventCount={events.length} photoCount={totalPhotos} />
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Suspense>
          <Gallery events={events} photographers={photographers} />
        </Suspense>
      </section>
    </main>
  )
}
