import { Globe } from 'lucide-react'
import type { Platform } from '@/lib/types'

// Lucide's installed version has no brand/logo icons, so every
// platform-specific icon here is hand-drawn; Globe is the only
// lucide-react icon left, used as the generic fallback.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .53.04.77.12v-3.2a5.7 5.7 0 0 0-.77-.05A5.72 5.72 0 1 0 15.54 15.4V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48Z" />
    </svg>
  )
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.2 22h-.01c-3.3-.02-5.83-1.11-7.53-3.24C3.15 16.87 2.36 14.24 2.33 12v-.02c.03-2.25.82-4.87 2.33-6.75C6.36 3.1 8.9 2.02 12.19 2h.02c2.52.02 4.63.67 6.27 1.94a7.9 7.9 0 0 1 2.6 3.62l-2.06.72a5.9 5.9 0 0 0-1.9-2.68c-1.24-.95-2.86-1.44-4.92-1.46-2.63.02-4.6.85-5.87 2.46-1.18 1.5-1.8 3.63-1.83 5.4.03 1.77.65 3.9 1.83 5.4 1.27 1.61 3.24 2.44 5.87 2.46 2.37-.02 3.94-.57 5.25-1.85 1.5-1.46 1.47-3.25 1-4.34-.29-.65-.8-1.19-1.5-1.6-.2 1.25-.62 2.26-1.26 3.02-.86 1.03-2.08 1.59-3.63 1.67-1.17.06-2.3-.21-3.16-.78a3.53 3.53 0 0 1-1.63-2.79c-.06-1.2.42-2.3 1.35-3.1.89-.76 2.14-1.2 3.62-1.28.98-.05 1.9 0 2.74.13-.11-.68-.34-1.22-.68-1.6-.47-.53-1.2-.8-2.16-.81h-.03c-.78 0-1.83.22-2.5 1.22l-1.75-1.18C9.24 6.3 10.68 5.5 12.36 5.5h.05c2.82.02 4.5 1.75 4.67 4.77l.01.03.34.15c1.4.66 2.42 1.65 2.96 2.88.75 1.7.82 4.48-1.44 6.68-1.73 1.68-3.82 2.44-6.75 2.46ZM13 12.9c-.22 0-.44 0-.67.02-1.86.1-3.02.96-2.96 2.18.06 1.28 1.47 1.87 2.83 1.8 1.24-.07 2.87-.55 3.15-3.75-.72-.16-1.5-.25-2.35-.25Z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23Zm-1.16 17.52h1.83L7.03 4.13H5.06l12.02 15.64Z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.5 21v-8.2h2.75l.41-3.19h-3.16V7.55c0-.92.26-1.55 1.57-1.55h1.68V3.14C16.46 3.1 15.4 3 14.17 3c-2.56 0-4.32 1.56-4.32 4.43v2.18H7.09v3.19h2.76V21h3.65Z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2c-2.72 0-3.06.01-4.13.06-1.07.05-1.8.22-2.44.47-.66.26-1.22.6-1.78 1.16A4.9 4.9 0 0 0 2.5 5.47c-.25.64-.42 1.37-.47 2.44C1.98 8.98 1.97 9.32 1.97 12s.01 3.02.06 4.09c.05 1.07.22 1.8.47 2.44.26.66.6 1.22 1.16 1.78.56.56 1.12.9 1.78 1.16.64.25 1.37.42 2.44.47 1.07.05 1.41.06 4.13.06s3.06-.01 4.13-.06c1.07-.05 1.8-.22 2.44-.47a4.9 4.9 0 0 0 1.78-1.16 4.9 4.9 0 0 0 1.16-1.78c.25-.64.42-1.37.47-2.44.05-1.07.06-1.41.06-4.09s-.01-3.02-.06-4.09c-.05-1.07-.22-1.8-.47-2.44a4.9 4.9 0 0 0-1.16-1.78A4.9 4.9 0 0 0 18.6 2.53c-.64-.25-1.37-.42-2.44-.47C15.09 2.01 14.75 2 12.03 2H12Zm0 1.8c2.67 0 2.99.01 4.04.06.98.04 1.51.21 1.86.34.47.18.8.4 1.15.75.35.35.57.68.75 1.15.13.35.3.88.34 1.86.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.04.98-.21 1.51-.34 1.86-.18.47-.4.8-.75 1.15-.35.35-.68.57-1.15.75-.35.13-.88.3-1.86.34-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-.98-.04-1.51-.21-1.86-.34a3.1 3.1 0 0 1-1.15-.75 3.1 3.1 0 0 1-.75-1.15c-.13-.35-.3-.88-.34-1.86-.05-1.05-.06-1.37-.06-4.04s.01-2.99.06-4.04c.04-.98.21-1.51.34-1.86.18-.47.4-.8.75-1.15.35-.35.68-.57 1.15-.75.35-.13.88-.3 1.86-.34 1.05-.05 1.37-.06 4.04-.06Zm0 3.06a5.14 5.14 0 1 0 0 10.28 5.14 5.14 0 0 0 0-10.28Zm0 8.48a3.34 3.34 0 1 1 0-6.68 3.34 3.34 0 0 1 0 6.68Zm6.54-8.68a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.96-1.97C18.88 4 12 4 12 4s-6.88 0-8.58.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.96 1.97C5.12 19.5 12 19.5 12 19.5s6.88 0 8.58-.45a2.78 2.78 0 0 0 1.96-1.97 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33ZM9.75 15.02V8.48l5.75 3.27-5.75 3.27Z" />
    </svg>
  )
}

const LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
  x: 'X',
  youtube: 'YouTube',
  other: 'Trang cá nhân',
}

export function PlatformIcon({
  platform,
  className = 'h-4 w-4',
}: {
  platform: Platform
  className?: string
}) {
  const label = LABELS[platform]
  const icon = (() => {
    switch (platform) {
      case 'tiktok':
        return <TikTokIcon className={className} />
      case 'facebook':
        return <FacebookIcon className={className} />
      case 'instagram':
        return <InstagramIcon className={className} />
      case 'threads':
        return <ThreadsIcon className={className} />
      case 'x':
        return <XIcon className={className} />
      case 'youtube':
        return <YoutubeIcon className={className} />
      default:
        return <Globe className={className} aria-hidden="true" />
    }
  })()

  return (
    <span className="inline-flex items-center" title={label}>
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  )
}
