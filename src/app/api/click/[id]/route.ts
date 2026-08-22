import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, extractClientIp } from '@/lib/rate-limit'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Một khách xem bảng xếp hạng có thể bấm vào vài profile khác nhau trong lúc
// lướt, nhưng không có lý do gì để bấm hàng chục lần vào cùng một profile —
// chặn ở mức rộng tay để không phạt nhầm người dùng thật đang so sánh vài
// profile, chỉ chặn bot spam click ảo.
const CLICK_MAX = 30
const CLICK_WINDOW_MS = 60 * 1000

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'ID không hợp lệ.' }, { status: 400 })
  }

  const ip = extractClientIp(request.headers) ?? 'unknown'
  if (!checkRateLimit(`click:${ip}`, { max: CLICK_MAX, windowMs: CLICK_WINDOW_MS })) {
    return NextResponse.json({ error: 'Quá nhiều lượt click.' }, { status: 429 })
  }

  const { error } = await getServiceClient().rpc('increment_profile_click', {
    p_profile_id: id,
    p_ip: ip,
  })

  if (error) {
    return NextResponse.json({ error: 'Không ghi nhận được lượt click.' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
