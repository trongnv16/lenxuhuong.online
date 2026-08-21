'use client' // Error boundary bắt buộc là Client Component

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    // Chỉ ghi log. Không hiển thị error.message ra giao diện: ở production
    // Next.js đã che nội dung lỗi từ Server Component, nhưng lỗi ném từ Client
    // Component thì vẫn giữ nguyên message và có thể lộ chi tiết nội bộ.
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="text-2xl font-bold sm:text-3xl">Đã có lỗi xảy ra</h1>
      <p className="max-w-sm text-ink-muted">
        Trang này không tải được. Thử lại giúp bạn, nếu vẫn lỗi thì quay về bảng
        xếp hạng rồi thử lại sau.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-primary px-8 py-3 font-semibold text-white transition hover:bg-primary-strong"
        >
          Thử lại
        </button>
        <Link
          href="/"
          className="rounded-full border border-line px-8 py-3 font-medium transition hover:border-primary"
        >
          Về bảng xếp hạng
        </Link>
      </div>
    </main>
  )
}
