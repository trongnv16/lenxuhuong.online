'use server'

import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getServiceClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import { ADMIN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, signSession } from '@/lib/admin-session'
import { isAdmin } from '@/lib/admin-guard'
import { checkRateLimit, resetRateLimit, extractClientIp } from '@/lib/rate-limit'
import type { ActionResult } from '@/actions/bid'

const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

// Khi không xác định được IP thật (chạy sau một proxy không gắn header
// chuẩn), mỗi request nhận một khoá ngẫu nhiên riêng thay vì dồn chung vào
// "unknown" — nếu không, ai đó gửi 5 request rỗng là tự khoá mọi người khỏi
// luồng đăng nhập/tải ảnh trong 15 phút, kể cả admin thật.
async function clientKey(prefix: string): Promise<string> {
  const ip = extractClientIp(await headers())
  const identity = ip ?? `unverified:${randomUUID()}`
  return `${prefix}:${identity}`
}

// timingSafeEqual ném lỗi khi hai buffer khác độ dài — mà độ dài chính là thứ
// ta không muốn rò rỉ. Băm cả hai phía về đúng 32 byte trước khi so sánh, cùng
// cách src/lib/admin-session.ts xử lý chữ ký phiên.
function secretEquals(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest()
  const hb = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(ha, hb)
}

// Proxy không bảo vệ được Server Action một cách đáng tin (docs Next.js cảnh báo
// action là POST tới chính route chứa nó). Mọi action admin phải tự kiểm tra.
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error('Không có quyền truy cập.')
  }
}

export async function loginAdmin(password: string): Promise<ActionResult<null>> {
  const env = getServerEnv()
  const key = await clientKey('login')

  // Đếm trước khi so mật khẩu: hết hạn mức thì không tốn một phép so nào nữa.
  if (!checkRateLimit(key, { max: LOGIN_MAX_ATTEMPTS, windowMs: LOGIN_WINDOW_MS })) {
    return { ok: false, error: 'Quá nhiều lần thử. Vui lòng thử lại sau.' }
  }

  if (!secretEquals(password, env.adminPassword)) {
    return { ok: false, error: 'Mật khẩu không đúng.' }
  }

  resetRateLimit(key)

  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  ;(await cookies()).set(ADMIN_COOKIE_NAME, signSession(expiresAt, env.adminSessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })

  return { ok: true, data: null }
}

export async function approveBid(
  bidId: string,
  receivedAmount: number,
): Promise<ActionResult<null>> {
  await requireAdmin()

  // Kiểm tra TRƯỚC khi chạm vào database. receivedAmount đến từ một ô
  // <input type="number"> tự do: chuỗi rỗng thành 0, chữ cái thành NaN, và NaN
  // đi qua PostgREST sẽ hoá null — lọt qua CHECK (received_amount > 0) vì cột
  // đó nullable, rồi mới chết ở profiles.amount (NOT NULL).
  if (!Number.isInteger(receivedAmount) || receivedAmount <= 0) {
    return { ok: false, error: 'Số tiền thực nhận phải là số nguyên dương.' }
  }

  // Toàn bộ phần duyệt nằm trong một hàm Postgres (0002_approve_bid.sql): khoá
  // dòng bid, đổi trạng thái, upsert profile và gán profile_id trong cùng một
  // giao dịch. Trước đây việc này là 5 lượt đi/về từ Node, và vì bid bị đổi
  // sang 'approved' — trạng thái cuối, không có đường quay lại — trước khi ghi
  // profile, một lượt ghi profile hỏng sẽ để lại bid cháy mà không có profile.
  const { error } = await getServiceClient().rpc('approve_bid', {
    p_bid_id: bidId,
    p_received_amount: receivedAmount,
  })

  if (error) {
    // Postgres gói RAISE EXCEPTION vào message của lỗi PostgREST.
    if (error.message?.includes('bid_not_awaiting_review')) {
      return { ok: false, error: 'Lượt bid này đã được xử lý.' }
    }
    if (error.message?.includes('bid_not_found')) {
      return { ok: false, error: 'Không tìm thấy lượt bid.' }
    }
    return { ok: false, error: 'Không duyệt được lượt bid. Thử lại sau.' }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, data: null }
}

export async function rejectBid(
  bidId: string,
  reason: string,
): Promise<ActionResult<null>> {
  await requireAdmin()

  const { data } = await getServiceClient()
    .from('bids')
    .update({
      status: 'rejected',
      reject_reason: reason.trim() || 'Không đối soát được giao dịch.',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', bidId)
    .eq('status', 'awaiting_review')
    .select('id')

  if (!data || data.length === 0) {
    return { ok: false, error: 'Lượt bid này đã được xử lý.' }
  }

  revalidatePath('/admin')
  return { ok: true, data: null }
}

export async function toggleProfileHidden(
  profileId: string,
  hidden: boolean,
): Promise<ActionResult<null>> {
  await requireAdmin()

  const { error } = await getServiceClient()
    .from('profiles')
    .update({ is_hidden: hidden })
    .eq('id', profileId)

  if (error) return { ok: false, error: 'Không cập nhật được profile.' }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, data: null }
}
