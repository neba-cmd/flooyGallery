"use client"

import { Search, X } from "lucide-react"
import type { EventDTO } from "@/types"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const ALL = "__all__"

type GalleryFiltersProps = {
  search: string
  onSearchChange: (value: string) => void
  eventId: string | undefined
  onEventChange: (value: string | undefined) => void
  photographer: string | undefined
  onPhotographerChange: (value: string | undefined) => void
  events: EventDTO[]
  photographers: string[]
  resultCount: number
}

export function GalleryFilters({
  search,
  onSearchChange,
  eventId,
  onEventChange,
  photographer,
  onPhotographerChange,
  events,
  photographers,
  resultCount,
}: GalleryFiltersProps) {
  const hasFilters = Boolean(search || eventId || photographer)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by photo number, filename or photographer…"
            className="h-11 rounded-xl pl-9"
            aria-label="Search photos"
          />
        </div>

        <div className="flex gap-3">
          <Select value={eventId ?? ALL} onValueChange={(v) => onEventChange(!v || v === ALL ? undefined : v)}>
            <SelectTrigger className="h-11 w-full rounded-xl sm:w-44" aria-label="Filter by event">
              <SelectValue>
                {(value) => (value === ALL ? "All events" : events.find((e) => e.id === value)?.name)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All events</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {photographers.length > 0 && (
            <Select
              value={photographer ?? ALL}
              onValueChange={(v) => onPhotographerChange(!v || v === ALL ? undefined : v)}
            >
              <SelectTrigger className="h-11 w-full rounded-xl sm:w-44" aria-label="Filter by photographer">
                <SelectValue>{(value) => (value === ALL ? "All photographers" : value)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All photographers</SelectItem>
                {photographers.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {resultCount.toLocaleString()} {resultCount === 1 ? "photo" : "photos"}
        </p>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground"
            onClick={() => {
              onSearchChange("")
              onEventChange(undefined)
              onPhotographerChange(undefined)
            }}
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
