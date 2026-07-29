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
import { cn } from "@/lib/utils"

const DAYS = ["All Days", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

type GalleryFiltersProps = {
  search: string
  onSearchChange: (value: string) => void
  eventId: string | undefined
  onEventChange: (value: string | undefined) => void
  dayOfWeek: number | undefined
  onDayChange: (value: number | undefined) => void
  events: EventDTO[]
  resultCount: number
}

export function GalleryFilters({
  search,
  onSearchChange,
  eventId,
  onEventChange,
  dayOfWeek,
  onDayChange,
  events,
  resultCount,
}: GalleryFiltersProps) {
  const hasMatches = events.length > 0

  return (
    <div className="flex flex-col gap-5">
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Filter matches by day">
        <div className="flex min-w-max gap-2" role="group">
          {DAYS.map((day, index) => {
            const value = index === 0 ? undefined : index
            const selected = dayOfWeek === value
            return (
              <Button
                key={day}
                type="button"
                variant={selected ? "default" : "outline"}
                className={cn("h-9 rounded-full px-4", selected && "shadow-sm")}
                aria-pressed={selected}
                onClick={() => onDayChange(value)}
              >
                {day}
              </Button>
            )
          })}
        </div>
      </div>

      {hasMatches ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-64">
            <Select value={eventId ?? ""} onValueChange={(value) => onEventChange(value || undefined)}>
              <SelectTrigger className="h-11 w-full rounded-xl" aria-label="Select a match">
                <SelectValue placeholder="Select a match" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {eventId && (
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by photo number or filename…"
                className="h-11 rounded-xl pl-9"
                aria-label="Search photos"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card px-5 py-10 text-center">
          <p className="font-medium">No matches have been uploaded for this day yet. Please check again later.</p>
        </div>
      )}

      {eventId && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {resultCount.toLocaleString()} {resultCount === 1 ? "photo" : "photos"}
          </p>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground"
              onClick={() => onSearchChange("")}
            >
              <X className="h-3.5 w-3.5" /> Clear search
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
