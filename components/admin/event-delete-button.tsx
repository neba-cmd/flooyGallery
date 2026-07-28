"use client"

import { useTransition } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deleteEventAction } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

export function EventDeleteButton({
  id,
  name,
  photoCount,
}: {
  id: string
  name: string
  photoCount: number
}) {
  const [pending, startTransition] = useTransition()

  function remove() {
    const detail = photoCount
      ? ` This will also permanently delete its ${photoCount} photos and stored files.`
      : ""
    if (!window.confirm(`Permanently delete “${name}”?${detail}`)) return
    startTransition(async () => {
      try {
        const result = await deleteEventAction(id)
        toast.success(`“${result.name}” and ${result.deletedPhotos} photos deleted`)
        if (result.storageCleanupFailed) {
          toast.warning("The event was deleted, but some stored files need manual cleanup.")
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete event")
      }
    })
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={remove}>
      <Trash2 />
      {pending ? "Deleting…" : "Delete"}
    </Button>
  )
}
