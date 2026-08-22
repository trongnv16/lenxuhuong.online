'use client'

import type { ReactNode, CSSProperties } from 'react'

// Tách riêng khỏi ProfileRow vì onClick đòi Client Component, còn phần còn lại
// của ProfileRow không cần chạy ở trình duyệt — giữ nó là Server Component để
// không kéo avatarPublicUrl (import 'server-only' qua @/lib/queries) vào bundle
// client.
export function ClickTrackingLink({
  href,
  profileId,
  className,
  style,
  children,
}: {
  href: string
  profileId: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={className}
      style={style}
      onClick={() => {
        // keepalive giữ request sống qua lúc trang điều hướng đi vì target=_blank
        // vẫn có thể huỷ fetch của tab gốc; không chặn việc mở link mới.
        fetch(`/api/click/${profileId}`, { method: 'POST', keepalive: true }).catch(() => {})
      }}
    >
      {children}
    </a>
  )
}
