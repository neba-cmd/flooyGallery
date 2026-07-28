"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deletePhotosAction } from "@/app/admin/actions"
import { SafeImage } from "@/components/safe-image"
import { Button } from "@/components/ui/button"

type ManagedPhoto = {
  id: string
  filename: string
  previewUrl: string
  photographer: string | null
  event: { name: string }
  ordered: boolean
}

export function PhotoManager({ photos }: { photos: ManagedPhoto[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const [pending, startTransition] = useTransition()
  const selectable = photos.filter((photo) => !photo.ordered).map((photo) => photo.id)
  const allSelected = selectable.length > 0 && selectable.every((id) => selected.includes(id))

  function remove(ids: string[]) {
    const count = ids.length
    if (!window.confirm(`Permanently delete ${count} ${count === 1 ? "photo" : "photos"} and their stored files?`)) return
    startTransition(async () => {
      try {
        const result = await deletePhotosAction(ids)
        setSelected((current) => current.filter((id) => !ids.includes(id)))
        toast.success(`${result.deleted} ${result.deleted === 1 ? "photo" : "photos"} deleted`)
        if (result.storageCleanupFailed) {
          toast.warning("Photo records were deleted, but some stored files need manual cleanup.")
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete photos")
      }
    })
  }

  if (!photos.length) {
    return <p className="rounded-xl border p-8 text-center text-muted-foreground">No photos uploaded yet.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={!selectable.length || pending}
            onChange={() => setSelected(allSelected ? [] : selectable)}
          />
          Select all deletable photos
        </label>
        <Button
          variant="destructive"
          size="sm"
          disabled={!selected.length || pending}
          onClick={() => remove(selected)}
        >
          <Trash2 />
          {pending ? "Deleting…" : `Delete selected (${selected.length})`}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {photos.map((photo) => (
          <div className="overflow-hidden rounded-xl border bg-card" key={photo.id}>
            <div className="relative aspect-square">
              <SafeImage src={photo.previewUrl || "/placeholder.svg"} alt={photo.filename} fill className="object-cover" />
              {!photo.ordered && (
                <label className="absolute left-2 top-2 grid size-8 place-items-center rounded-lg bg-background/90 shadow">
                  <input
                    type="checkbox"
                    aria-label={`Select ${photo.filename}`}
                    checked={selected.includes(photo.id)}
                    disabled={pending}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked ? [...current, photo.id] : current.filter((id) => id !== photo.id),
                      )
                    }
                  />
                </label>
              )}
            </div>
            <div className="space-y-2 p-3">
              <div>
                <p className="truncate text-sm">{photo.filename}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {photo.event.name} · {photo.photographer || "Unknown"}
                </p>
              </div>
              {photo.ordered ? (
                <p className="text-xs text-muted-foreground">Protected by an order</p>
              ) : (
                <Button
                  className="w-full"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => remove([photo.id])}
                >
                  <Trash2 />
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
