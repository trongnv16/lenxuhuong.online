'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getServiceClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import { ADMIN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, signSession } from '@/lib/admin-session'
import { isAdmin } from '@/lib/admin-guard'
import { assertTransition } from '@/lib/bid-status'
import type { ActionResult } from '@/actions/bid'
import type { Bid } from '@/lib/types'

// Proxy không bảo vệ được Server Action một cách đáng tin (docs Next.js cảnh báo
// action là POST tới chính route chứa nó). Mọi action admin phải tự kiểm tra.
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error('Không có quyền truy cập.')
  }
}

export async function loginAdmin(password: string): Promise<ActionResult<null>> {
  const env = getServerEnv()
  if (password !== env.adminPassword) {
    return { ok: false, error: 'Mật khẩu không đúng.' }
  }

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
  const supabase = getServiceClient()

  const { data: bid } = await supabase
    .from('bids')
    .select('*')
    .eq('id', bidId)
    .maybeSingle<Bid>()

  if (!bid) return { ok: false, error: 'Không tìm thấy lượt bid.' }

  try {
    assertTransition(bid.status, 'approved')
  } catch {
    return { ok: false, error: 'Lượt bid này đã được xử lý.' }
  }

  // Điều kiện status chặn duyệt hai lần khi mở nhiều tab.
  const { data: claimed } = await supabase
    .from('bids')
    .update({
      status: 'approved',
      received_amount: receivedAmount,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', bidId)
    .eq('status', 'awaiting_review')
    .select('id')

  if (!claimed || claimed.length === 0) {
    return { ok: false, error: 'Lượt bid này đã được xử lý.' }
  }

  const now = new Date().toISOString()
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, amount, first_ranked_at')
    .eq('social_url', bid.social_url)
    .maybeSingle<{ id: string; amount: number; first_ranked_at: string }>()

  if (existing) {
    // Thứ hạng chỉ tăng, không bao giờ giảm vì một lượt bid thấp hơn.
    //
    // Hai bid `awaiting_review` khác nhau cho cùng social_url có thể được duyệt
    // gần như đồng thời (hai tab admin). Nếu đọc existing.amount rồi tính max ở
    // JS và ghi lại bằng UPDATE riêng, sẽ có khoảng hở TOCTOU: cả hai lần duyệt
    // có thể đọc cùng giá trị cũ trước khi bên nào ghi, khiến số tiền thấp hơn
    // thắng — vi phạm bất biến "amount chỉ tăng". Dùng optimistic lock
    // (`.eq('amount', currentAmount)`) để UPDATE chỉ thành công khi dòng chưa bị
    // ai khác đổi kể từ lần đọc gần nhất; nếu thua, đọc lại và thử lại hoặc dừng
    // nếu số hiện tại đã >= receivedAmount (một lượt duyệt khác đã thắng).
    let currentAmount = existing.amount
    for (let attempt = 0; attempt < 5; attempt++) {
      if (currentAmount >= receivedAmount) break

      const { data: updated } = await supabase
        .from('profiles')
        .update({
          platform: bid.platform,
          handle: bid.handle,
          display_name: bid.display_name,
          bio: bid.bio,
          avatar_path: bid.avatar_path,
          amount: receivedAmount,
          ranked_at: now,
        })
        .eq('id', existing.id)
        .eq('amount', currentAmount)
        .select('id, amount')
        .maybeSingle<{ id: string; amount: number }>()

      if (updated) break

      const { data: refreshed } = await supabase
        .from('profiles')
        .select('amount')
        .eq('id', existing.id)
        .maybeSingle<{ amount: number }>()

      if (!refreshed) break
      currentAmount = refreshed.amount
    }

    await supabase.from('bids').update({ profile_id: existing.id }).eq('id', bidId)
  } else {
    const { data: created } = await supabase
      .from('profiles')
      .insert({
        social_url: bid.social_url,
        platform: bid.platform,
        handle: bid.handle,
        display_name: bid.display_name,
        bio: bid.bio,
        avatar_path: bid.avatar_path,
        amount: receivedAmount,
        first_ranked_at: now,
        ranked_at: now,
      })
      .select('id')
      .maybeSingle<{ id: string }>()

    if (created) {
      await supabase.from('bids').update({ profile_id: created.id }).eq('id', bidId)
    }
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
