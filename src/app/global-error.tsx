'use client' // Error boundary bắt buộc là Client Component

import { useEffect } from 'react'

// File này thay thế HOÀN TOÀN root layout khi chính layout đó lỗi, nên phải tự
// dựng <html>/<body>. Theo docs Next.js, global-error render document riêng và
// KHÔNG kéo theo globals.css — nên mọi màu sắc ở đây viết inline, không dùng
// class Tailwind (chúng sẽ không có định nghĩa nào ở thời điểm này).
const COBALT = '#3B6FE0'
const COBALT_STRONG = '#2A52B0'
const INK = '#12161F'
const INK_MUTED = '#5B6472'

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem 1rem',
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          color: INK,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <title>Đã có lỗi xảy ra — lên xu hướng</title>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          Đã có lỗi xảy ra
        </h1>
        <p style={{ maxWidth: '24rem', margin: 0, color: INK_MUTED }}>
          Trang không tải được. Bấm thử lại, nếu vẫn lỗi thì quay lại sau ít
          phút.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            marginTop: '0.5rem',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#FFFFFF',
            backgroundColor: COBALT,
            cursor: 'pointer',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = COBALT_STRONG
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = COBALT
          }}
        >
          Thử lại
        </button>
        <a href="/" style={{ color: COBALT, fontSize: '0.875rem' }}>
          Về bảng xếp hạng
        </a>
      </body>
    </html>
  )
}
