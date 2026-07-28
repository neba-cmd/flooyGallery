"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"

export function SafeImage({ src, alt, ...props }: ImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src || "/placeholder.svg")
  return (
    <Image
      {...props}
      src={resolvedSrc}
      alt={alt}
      onError={() => setResolvedSrc("/placeholder.svg")}
    />
  )
}
