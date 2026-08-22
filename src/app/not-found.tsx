import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  description: 'Đường dẫn này không tồn tại hoặc đã bị gỡ.',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="text-2xl font-bold sm:text-3xl">Không tìm thấy trang</h1>
      <p className="max-w-sm text-ink-muted">
        Đường dẫn này không tồn tại, hoặc đã bị gỡ. Kiểm tra lại link hoặc quay
        về bảng xếp hạng.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-primary px-8 py-3 font-semibold text-white transition hover:bg-primary-strong"
      >
        Về bảng xếp hạng
      </Link>
    </main>
  )
}
