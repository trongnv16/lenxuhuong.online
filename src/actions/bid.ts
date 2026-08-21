'use server'

import { randomUUID } from 'node:crypto'
import { getServiceClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import { normalizeSocialUrl } from '@/lib/social'
import { validateBidAmount } from '@/lib/money'
import { generateRefCode } from '@/lib/ref-code'
import { assertTransition } from '@/lib/bid-status'
import { sendBidNotification } from '@/lib/telegram'
import { sortForLeaderboard, predictRank } from '@/lib/ranking'
import {
  fetchVisibleProfiles,
  fetchProfileBySocialUrl,
  fetchBidByRefCode,
} from '@/lib/queries'

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const MAX_NAME = 50
const MAX_BIO = 200

export async function requestAvatarUploadUrl(): Promise<
  ActionResult<{ path: string; token: string }>
> {
  const path = `${randomUUID()}.jpg`
  const { data, error } = await getServiceClient()
    .storage.from('avatars')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return { ok: false, error: 'Không tạo được đường dẫn tải ảnh. Thử lại sau.' }
  }
  return { ok: true, data: { path, token: data.token } }
}

export async function requestReceiptUploadUrl(
  refCode: string,
): Promise<ActionResult<{ path: string; token: string }>> {
  const bid = await fetchBidByRefCode(refCode)
  if (!bid) return { ok: false, error: 'Không tìm thấy mã tham chiếu này.' }

  const path = `${refCode}/${randomUUID()}.jpg`
  const { data, error } = await getServiceClient()
    .storage.from('receipts')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return { ok: false, error: 'Không tạo được đường dẫn tải ảnh. Thử lại sau.' }
  }
  return { ok: true, data: { path, token: data.token } }
}

export type CreateBidInput = {
  socialUrl: string
  displayName: string
  bio: string
  avatarPath: string
  amount: number
}

export async function createBid(
  input: CreateBidInput,
): Promise<ActionResult<{ refCode: string }>> {
  const social = normalizeSocialUrl(input.socialUrl)
  if (!social) {
    return { ok: false, error: 'Link mạng xã hội không hợp lệ.' }
  }

  const displayName = input.displayName.trim()
  if (!displayName || displayName.length > MAX_NAME) {
    return { ok: false, error: `Tên hiển thị từ 1 đến ${MAX_NAME} ký tự.` }
  }

  const bio = input.bio.trim()
  if (!bio || bio.length > MAX_BIO) {
    return { ok: false, error: `Giới thiệu từ 1 đến ${MAX_BIO} ký tự.` }
  }

  if (!input.avatarPath) {
    return { ok: false, error: 'Bạn cần tải lên ảnh đại diện.' }
  }

  const existing = await fetchProfileBySocialUrl(social.url)
  const amountError = validateBidAmount(input.amount, {
    minAmount: getServerEnv().minBidAmount,
    currentProfileAmount: existing?.amount ?? null,
  })
  if (amountError) return { ok: false, error: amountError.message }

  // Mã tham chiếu có thể trùng, thử lại vài lần trước khi bỏ cuộc.
  for (let attempt = 0; attempt < 5; attempt++) {
    const refCode = generateRefCode()
    const { error } = await getServiceClient().from('bids').insert({
      profile_id: existing?.id ?? null,
      ref_code: refCode,
      amount: input.amount,
      status: 'pending',
      social_url: social.url,
      platform: social.platform,
      handle: social.handle,
      display_name: displayName,
      bio,
      avatar_path: input.avatarPath,
    })

    if (!error) return { ok: true, data: { refCode } }
    // 23505 là mã lỗi trùng khoá duy nhất của Postgres.
    if (error.code !== '23505') {
      return { ok: false, error: 'Không tạo được lượt bid. Thử lại sau.' }
    }
  }

  return { ok: false, error: 'Không sinh được mã tham chiếu. Thử lại sau.' }
}

export async function submitBid(
  refCode: string,
  receiptPath: string | null,
): Promise<ActionResult<null>> {
  const bid = await fetchBidByRefCode(refCode)
  if (!bid) return { ok: false, error: 'Không tìm thấy mã tham chiếu này.' }

  try {
    assertTransition(bid.status, 'awaiting_review')
  } catch {
    return { ok: false, error: 'Lượt bid này đã được gửi đi trước đó.' }
  }

  // Điều kiện status chặn hai tab cùng gửi một lúc.
  const { data, error } = await getServiceClient()
    .from('bids')
    .update({
      status: 'awaiting_review',
      submitted_at: new Date().toISOString(),
      receipt_path: receiptPath,
    })
    .eq('ref_code', refCode)
    .eq('status', 'pending')
    .select('id')

  if (error) return { ok: false, error: 'Không gửi được xác nhận. Thử lại sau.' }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Lượt bid này đã được gửi đi trước đó.' }
  }

  const sorted = sortForLeaderboard(await fetchVisibleProfiles())
  await sendBidNotification({
    refCode: bid.ref_code,
    amount: bid.amount,
    displayName: bid.display_name,
    platform: bid.platform,
    socialUrl: bid.social_url,
    predictedRank: predictRank(bid.amount, sorted),
  })

  return { ok: true, data: null }
}
