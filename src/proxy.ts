import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE_NAME, verifySession } from '@/lib/admin-session'

// Next.js 16: middleware đã đổi tên thành proxy, hàm xuất tên là `proxy`.
// Proxy chạy Node.js runtime nên dùng được node:crypto trong admin-session.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  const secret = process.env.ADMIN_SESSION_SECRET

  if (!secret || !verifySession(token, secret)) {
    return NextResponse.redirect(new URL('/admin401426/dang-nhap', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Chỉ chặn /admin401426, không chặn /admin401426/dang-nhap để tránh vòng lặp chuyển hướng.
  matcher: ['/admin401426'],
}
