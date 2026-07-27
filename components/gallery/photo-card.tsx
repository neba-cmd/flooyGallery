"use client"

import { memo } from "react"
import { Check, Plus, Maximize2 } from "lucide-react"
import type { PhotoDTO } from "@/types"
import { useCart } from "@/components/cart/cart-provider"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

type PhotoCardProps = {
  photo: PhotoDTO
  onOpen: (photo: PhotoDTO) => void
}

function PhotoCardBase({ photo, onOpen }: PhotoCardProps) {
  const { hasItem, toggleItem } = useCart()
  const selected = hasItem(photo.id)
  const ratio = photo.width && photo.height ? photo.width / photo.height : 3 / 2

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-muted ring-1 ring-border/60 transition-shadow duration-300",
        "hover:shadow-lg hover:shadow-black/5",
        selected && "ring-2 ring-primary",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(photo)}
        className="block w-full"
        aria-label={`Open photo ${photo.photoNumber ?? photo.filename}`}
        style={{ aspectRatio: ratio }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.previewUrl || "/placeholder.svg"}
          alt={`Preview of ${photo.filename}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {/* Watermark overlay — reinforces the DB-side watermark and deters screenshots */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-xl font-semibold tracking-widest text-white/25 mix-blend-overlay select-none"
        >
          FLOOY
        </span>
      </button>

      {/* Top gradient + meta */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/40 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="rounded-md bg-black/40 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {photo.photoNumber ? `#${photo.photoNumber}` : photo.filename}
        </span>
      </div>

      {/* Bottom bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2.5">
        <button
          type="button"
          onClick={() => onOpen(photo)}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-lg bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 group-hover:opacity-100"
          aria-label="View larger"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => toggleItem({ photoId: photo.id, price: photo.price, filename: photo.filename, previewUrl: photo.previewUrl, photoNumber: photo.photoNumber })}
          className={cn(
            "pointer-events-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-colors",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-white/90 text-foreground hover:bg-white",
          )}
          aria-pressed={selected}
        >
          {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {formatPrice(photo.price)}
        </button>
      </div>
    </div>
  )
}

export const PhotoCard = memo(PhotoCardBase)
