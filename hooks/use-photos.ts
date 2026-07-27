"use client"

import useSWRInfinite from "swr/infinite"
import type { PhotoPage } from "@/lib/services/photos"

export type PhotoFilters = {
  eventId?: string
  search?: string
  photographer?: string
  dateFrom?: string
  dateTo?: string
}

const fetcher = async (url: string): Promise<PhotoPage> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load photos")
  return res.json()
}

function buildUrl(filters: PhotoFilters, cursor: string | null) {
  const params = new URLSearchParams()
  if (filters.eventId) params.set("eventId", filters.eventId)
  if (filters.search) params.set("search", filters.search)
  if (filters.photographer) params.set("photographer", filters.photographer)
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
  if (filters.dateTo) params.set("dateTo", filters.dateTo)
  if (cursor) params.set("cursor", cursor)
  params.set("limit", "30")
  return `/api/photos?${params.toString()}`
}

export function usePhotos(filters: PhotoFilters) {
  const { data, size, setSize, isLoading, isValidating, error } = useSWRInfinite<PhotoPage>(
    (index, previous) => {
      if (previous && previous.nextCursor === null) return null // reached the end
      const cursor = index === 0 ? null : (previous?.nextCursor ?? null)
      return buildUrl(filters, cursor)
    },
    fetcher,
    { revalidateFirstPage: false, revalidateOnFocus: false },
  )

  const pages = data ?? []
  const photos = pages.flatMap((p) => p.photos)
  const total = pages[0]?.total ?? 0
  const reachedEnd = pages.length > 0 && pages[pages.length - 1].nextCursor === null
  const isLoadingMore = isValidating && pages.length > 0 && !reachedEnd

  return {
    photos,
    total,
    error,
    isLoading,
    isLoadingMore,
    reachedEnd,
    loadMore: () => setSize(size + 1),
    size,
  }
}
