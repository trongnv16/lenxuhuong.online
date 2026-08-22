'use client'

import { useState } from 'react'

export function AvatarImage({
  src,
  alt,
  background,
  foreground,
}: {
  src: string | null
  alt: string
  background: string
  foreground: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    return (
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl sm:h-16 sm:w-16 sm:rounded-[14px]"
        style={{ background }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={foreground}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
        </svg>
        <span className="sr-only">{alt}</span>
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-xl object-cover sm:h-16 sm:w-16 sm:rounded-[14px]"
      style={{ background }}
    />
  )
}
