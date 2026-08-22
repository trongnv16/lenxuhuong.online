import type { Metadata } from 'next'

// Khu vực quản trị: chặn mọi bot ở tầng thẻ meta, song song với robots.txt.
// Trang đăng nhập là client component nên không tự export metadata được —
// layout này phủ cho cả segment.
export const metadata: Metadata = {
  title: 'Quản trị',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export default function AdminLayout({ children }: LayoutProps<'/admin401426'>) {
  return children
}
