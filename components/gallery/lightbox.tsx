"use client"

import { useEffect, useState, useCallback } from "react"
import { ChevronLeft, ChevronRight, X, Check, Plus, ZoomIn, ZoomOut } from "lucide-react"
import type { PhotoDTO } from "@/types"
import { useCart } from "@/components/cart/cart-provider"
import { formatPrice } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type LightboxProps = {
  photos: PhotoDTO[]
  index: number | null
  onClose: () => void
  onNavigate: (index: number) => void
}

export function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const { hasItem, toggleItem } = useCart()
  const [zoomed, setZoomed] = useState(false)

  const open = index !== null
  const photo = open ? photos[index] : null

  const goPrev = useCallback(() => {
    if (index === null) return
    onNavigate((index - 1 + photos.length) % photos.length)
    setZoomed(false)
  }, [index, photos.length, onNavigate])

  const goNext = useCallback(() => {
    if (index === null) return
    onNavigate((index + 1) % photos.length)
    setZoomed(false)
  }, [index, photos.length, onNavigate])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowLeft") goPrev()
      else if (e.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose, goPrev, goNext])

  if (!open || !photo) return null

  const selected = hasItem(photo.id)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {photo.photoNumber ? `Photo #${photo.photoNumber}` : photo.filename}
          </p>
          <p className="truncate text-xs text-muted-foreground">{photo.eventName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setZoomed((z) => !z)} aria-label="Toggle zoom">
            {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 sm:px-16">
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-card/80 text-foreground shadow-sm ring-1 ring-border backdrop-blur-sm transition hover:bg-card sm:left-4"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className={cn("relative max-h-full overflow-auto", zoomed && "cursor-zoom-out")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.previewUrl || "/placeholder.svg"}
            alt={`Preview of ${photo.filename}`}
            onError={(event) => {
              event.currentTarget.src = "/placeholder.svg"
            }}
            onClick={() => setZoomed((z) => !z)}
            className={cn(
              "mx-auto rounded-lg object-contain transition-transform duration-300",
              zoomed ? "max-w-none scale-150 cursor-zoom-out" : "max-h-[70vh] cursor-zoom-in",
            )}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl font-bold tracking-[0.3em] text-white/20 mix-blend-overlay select-none"
          >
            FLOOY
          </span>
        </div>

        <button
          type="button"
          onClick={goNext}
          className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-card/80 text-foreground shadow-sm ring-1 ring-border backdrop-blur-sm transition hover:bg-card sm:right-4"
          aria-label="Next photo"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-center gap-4 border-t border-border/60 bg-card/50 px-4 py-4 backdrop-blur-sm">
        <span className="text-sm text-muted-foreground">
          {index + 1} of {photos.length}
        </span>
        <Button
          onClick={() =>
            toggleItem({
              photoId: photo.id,
              price: photo.price,
              filename: photo.filename,
              previewUrl: photo.previewUrl,
              photoNumber: photo.photoNumber,
              eventId: photo.eventId,
              eventName: photo.eventName,
            })
          }
          variant={selected ? "secondary" : "default"}
          className="gap-2"
        >
          {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {selected ? "Added" : `Add · ${formatPrice(photo.price)}`}
        </Button>
      </div>
    </div>
  )
}
