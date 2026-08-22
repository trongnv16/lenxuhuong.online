import type { Platform } from '@/lib/types'

const IMAGE_SRC: Partial<Record<Platform, string>> = {
  tiktok: '/social_icon/tiktok.webp',
  facebook: '/social_icon/fb.webp',
  instagram: '/social_icon/ig.png',
  threads: '/social_icon/threads.webp',
  x: '/social_icon/x.webp',
  youtube: '/social_icon/youtube.png',
}

// Threads/X chỉ có glyph đen trong suốt, không có nền sẵn — cần khung nền
// trắng + padding để đồng bộ vòng tròn với các icon còn lại (đã có nền).
const NEEDS_WHITE_BG: Partial<Record<Platform, true>> = {
  threads: true,
  x: true,
}

const LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
  x: 'X',
  youtube: 'YouTube',
  other: 'Liên kết',
}

const OTHER_PATH = 'M11 5h2v10h-2z M11 17h2v2h-2z'

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const src = IMAGE_SRC[platform]

  if (!src) {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        role="img"
        aria-label={LABELS[platform]}
      >
        <path d={OTHER_PATH} />
      </svg>
    )
  }

  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full ${className ?? ''}`}
      style={NEEDS_WHITE_BG[platform] ? { background: '#FFFFFF', border: '1px solid var(--color-line)' } : undefined}
    >
      <img
        src={src}
        alt={LABELS[platform]}
        width={24}
        height={24}
        className={NEEDS_WHITE_BG[platform] ? 'h-[60%] w-[60%] object-contain' : 'h-full w-full object-cover'}
      />
    </span>
  )
}
