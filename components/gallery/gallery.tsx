"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ImageOff, Loader2 } from "lucide-react"
import type { EventDTO, PhotoDTO } from "@/types"
import { usePhotos, type PhotoFilters } from "@/hooks/use-photos"
import { useDebounced } from "@/hooks/use-debounced"
import { PhotoCard } from "./photo-card"
import { GalleryFilters } from "./gallery-filters"
import { Lightbox } from "./lightbox"
import { Skeleton } from "@/components/ui/skeleton"

type GalleryProps = {
  events: EventDTO[]
  initialEventId?: string
}

export function Gallery({ events, initialEventId }: GalleryProps) {
  const [search, setSearch] = useState("")
  const [eventId, setEventId] = useState<string | undefined>(initialEventId)
  const [date, setDate] = useState("")
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const debouncedSearch = useDebounced(search, 350)
  const dateRange = useMemo(() => {
    if (!date) return {}
    const start = new Date(`${date}T00:00:00`)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { dateFrom: start.toISOString(), dateTo: end.toISOString() }
  }, [date])

  const filters: PhotoFilters = useMemo(
    () => ({ search: debouncedSearch || undefined, eventId, ...dateRange }),
    [debouncedSearch, eventId, dateRange],
  )

  const { photos, total, error, isLoading, isLoadingMore, reachedEnd, loadMore } = usePhotos(filters)

  // Infinite scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && !reachedEnd) loadMore()
      },
      { rootMargin: "800px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isLoadingMore, reachedEnd, loadMore])

  const openLightbox = useCallback(
    (photo: PhotoDTO) => {
      const idx = photos.findIndex((p) => p.id === photo.id)
      if (idx >= 0) setLightboxIndex(idx)
    },
    [photos],
  )

  return (
    <div className="flex flex-col gap-6">
      <GalleryFilters
        search={search}
        onSearchChange={setSearch}
        eventId={eventId}
        onEventChange={setEventId}
        date={date}
        onDateChange={setDate}
        events={events}
        resultCount={total}
      />

      {error && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card py-16 text-center">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Couldn&apos;t load photos. Please try again.</p>
        </div>
      )}

      {isLoading ? (
        <MasonrySkeleton />
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card py-20 text-center">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No photos found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="[column-fill:_balance] columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">
          {photos.map((photo) => (
            <div key={photo.id} className="mb-3 break-inside-avoid">
              <PhotoCard photo={photo} onOpen={openLightbox} />
            </div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="flex justify-center py-6">
        {isLoadingMore && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        {reachedEnd && photos.length > 0 && (
          <p className="text-sm text-muted-foreground">You&apos;ve reached the end</p>
        )}
      </div>

      <Lightbox
        photos={photos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </div>
  )
}

function MasonrySkeleton() {
  const heights = [220, 300, 180, 260, 340, 200, 280, 240, 320, 190]
  return (
    <div className="[column-fill:_balance] columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5">
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="mb-3 break-inside-avoid">
          <Skeleton className="w-full rounded-2xl" style={{ height: heights[i % heights.length] }} />
        </div>
      ))}
    </div>
  )
}
