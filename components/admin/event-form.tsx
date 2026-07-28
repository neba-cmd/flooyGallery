"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { saveEventAction, toggleEventAction } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import type { EventDTO } from "@/types"

export function EventForm({ event }: { event?: EventDTO & { description?: string | null; published?: boolean } }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  return <>
    <Button variant={event ? "outline" : "default"} onClick={() => setOpen(true)}>{event ? "Edit" : "Create event"}</Button>
    {event && <Button variant="ghost" onClick={() => startTransition(async () => {
      try { await toggleEventAction(event.id, !(event.published ?? true)); toast.success("Event visibility updated") }
      catch (e) { toast.error(e instanceof Error ? e.message : "Update failed") }
    })}>{event.published === false ? "Activate" : "Deactivate"}</Button>}
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-auto rounded-2xl bg-card p-6" onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        startTransition(async () => {
          try {
            await saveEventAction({ id: event?.id, name: String(f.get("name")), slug: String(f.get("slug")), location: String(f.get("location")), description: String(f.get("description")), date: String(f.get("date")), defaultPrice: Number(f.get("defaultPrice")), published: f.get("published") === "on" })
            toast.success("Event saved"); setOpen(false)
          } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save event") }
        })
      }}>
        <div className="flex justify-between"><h2 className="text-lg font-semibold">{event ? "Edit event" : "New event"}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
        <label className="block text-sm">Name<input required name="name" defaultValue={event?.name} className="mt-1 h-9 w-full rounded-lg border bg-background px-3" /></label>
        <label className="block text-sm">Slug<input required name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={event?.slug} className="mt-1 h-9 w-full rounded-lg border bg-background px-3" /></label>
        <label className="block text-sm">Date<input type="datetime-local" name="date" defaultValue={event?.date?.slice(0,16)} className="mt-1 h-9 w-full rounded-lg border bg-background px-3" /></label>
        <label className="block text-sm">Location<input name="location" defaultValue={event?.location ?? ""} className="mt-1 h-9 w-full rounded-lg border bg-background px-3" /></label>
        <label className="block text-sm">Description<textarea name="description" defaultValue={event?.description ?? ""} className="mt-1 min-h-20 w-full rounded-lg border bg-background p-3" /></label>
        <label className="block text-sm">Default price (pence)<input required type="number" min="0" name="defaultPrice" defaultValue={event?.defaultPrice ?? 1500} className="mt-1 h-9 w-full rounded-lg border bg-background px-3" /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" name="published" defaultChecked={event?.published ?? true} />Active/public</label>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={pending}>{pending ? "Saving…" : "Save"}</Button></div>
      </form>
    </div>}
  </>
}
