import 'server-only'
import { getServiceClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import type { Bid, BidStatus, Profile } from '@/lib/types'

// PostgREST tự cắt kết quả ở 1000 dòng. Viết .limit(1000) ra mặt để trần giới
// hạn đó thành thứ đọc được trong code, thay vì để profile thứ 1001 lặng lẽ
// biến mất khỏi bảng xếp hạng mà không có lỗi nào.
//
// Cách sửa đúng về lâu dài là phân trang thật ở tầng DB (chỉ lấy 10 dòng của
// trang hiện tại bằng .range()), nhưng làm vậy phải viết lại hợp đồng
// "tất-cả-trong-bộ-nhớ" của sortForLeaderboard/paginate ở mọi nơi đang gọi
// (src/app/page.tsx, và src/app/dat-bid/page.tsx cho prop Rankable[]). Để lại
// cho lúc bảng thường xuyên vượt vài trăm dòng.
const LEADERBOARD_HARD_LIMIT = 1000

export async function fetchVisibleProfiles(): Promise<Profile[]> {
  const { data, error } = await getServiceClient()
    .from('profiles')
    .select('*')
    .eq('is_hidden', false)
    .order('amount', { ascending: false })
    .order('first_ranked_at', { ascending: true })
    .limit(LEADERBOARD_HARD_LIMIT)

  if (error) throw new Error(`Không đọc được bảng xếp hạng: ${error.message}`)
  return (data ?? []) as Profile[]
}

export async function fetchProfileBySocialUrl(url: string): Promise<Profile | null> {
  const { data, error } = await getServiceClient()
    .from('profiles')
    .select('*')
    .eq('social_url', url)
    .maybeSingle()

  if (error) throw new Error(`Không đọc được profile: ${error.message}`)
  return (data as Profile | null) ?? null
}

export async function fetchBidByRefCode(refCode: string): Promise<Bid | null> {
  const { data, error } = await getServiceClient()
    .from('bids')
    .select('*')
    .eq('ref_code', refCode)
    .maybeSingle()

  if (error) throw new Error(`Không đọc được bid: ${error.message}`)
  return (data as Bid | null) ?? null
}

export async function fetchBidsByStatus(status: BidStatus): Promise<Bid[]> {
  const { data, error } = await getServiceClient()
    .from('bids')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Không đọc được danh sách bid: ${error.message}`)
  return (data ?? []) as Bid[]
}

export function avatarPublicUrl(path: string): string {
  const env = getServerEnv()
  return `${env.supabaseUrl}/storage/v1/object/public/avatars/${path}`
}

export async function receiptSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await getServiceClient()
    .storage.from('receipts')
    .createSignedUrl(path, 60)

  if (error) return null
  return data?.signedUrl ?? null
}
