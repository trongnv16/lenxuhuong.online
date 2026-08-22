import { describe, it, expect, beforeEach, vi } from 'vitest'

// Không đụng vào database thật: quy ước của repo là Vitest chỉ chạy logic thuần,
// còn đường đi tới Supabase để cho Playwright và kiểm chứng tay lo.

const rpc = vi.fn()
const from = vi.fn()

vi.mock('server-only', () => ({}))

vi.mock('@/lib/supabase/server', () => ({
  getServiceClient: () => ({ rpc, from }),
}))

// Mặc định đã đăng nhập; test nào cần trạng thái khác thì tự đổi.
const isAdmin = vi.fn(async () => true)
vi.mock('@/lib/admin-guard', () => ({ isAdmin: () => isAdmin() }))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const cookieStore = { set: vi.fn(), get: vi.fn() }
vi.mock('next/headers', () => ({
  cookies: async () => cookieStore,
  headers: async () => ({ get: () => '203.0.113.7' }),
}))

const { approveBid, rejectBid, toggleProfileHidden, loginAdmin } = await import(
  '@/actions/admin'
)
const { clearAllRateLimits } = await import('@/lib/rate-limit')

/**
 * Chuỗi `.from(...).update(...).eq(...).eq(...).select(...)` của Supabase là
 * một builder trả về chính nó cho tới mắt xích cuối, nơi nó mới thành thenable.
 * Bản giả này chỉ cần đúng bấy nhiêu, không cần dựng lại cả client.
 */
function mockChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  for (const method of ['update', 'eq', 'select', 'insert']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  clearAllRateLimits()
  isAdmin.mockResolvedValue(true)
  process.env.ADMIN_PASSWORD = 'mat-khau-dung'
  process.env.ADMIN_SESSION_SECRET = 'secret-phien'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
  process.env.TELEGRAM_BOT_TOKEN = 'token'
  process.env.TELEGRAM_CHAT_ID = '123'
  process.env.BANK_ACCOUNT_NUMBER = '0123456789'
  process.env.BANK_CODE = 'ACB'
  process.env.BANK_ACCOUNT_NAME = 'NGUYEN VAN A'
  process.env.NEXT_PUBLIC_SITE_URL = 'https://xuhuong.online'
})

const BID_ID = '11111111-1111-1111-1111-111111111111'

describe('approveBid — kiểm tra số tiền thực nhận', () => {
  const INVALID: Array<[string, number]> = [
    ['NaN (admin gõ chữ vào ô số)', Number('abc')],
    ['0 (ô số bị bỏ trống)', Number('')],
    ['số âm', -5],
    ['số thập phân', 1.5],
    ['Infinity', Number.POSITIVE_INFINITY],
  ]

  for (const [label, value] of INVALID) {
    it(`từ chối ${label} và không gọi database`, async () => {
      const result = await approveBid(BID_ID, value)

      expect(result).toEqual({
        ok: false,
        error: 'Số tiền thực nhận phải là số nguyên dương.',
      })
      // Điểm mấu chốt: chặn TRƯỚC khi ghi, nên bid không bị cháy sang 'approved'.
      expect(rpc).not.toHaveBeenCalled()
      expect(from).not.toHaveBeenCalled()
    })
  }

  it('chấp nhận số nguyên dương và gọi RPC approve_bid đúng tham số', async () => {
    rpc.mockResolvedValue({ data: 'profile-uuid', error: null })

    const result = await approveBid(BID_ID, 50_000)

    expect(result).toEqual({ ok: true, data: null })
    expect(rpc).toHaveBeenCalledWith('approve_bid', {
      p_bid_id: BID_ID,
      p_received_amount: 50_000,
    })
  })
})

describe('approveBid — lỗi trả về từ RPC', () => {
  it('báo "đã được xử lý" khi bid không còn ở awaiting_review', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'bid_not_awaiting_review', code: 'P0001' },
    })

    expect(await approveBid(BID_ID, 50_000)).toEqual({
      ok: false,
      error: 'Lượt bid này đã được xử lý.',
    })
  })

  it('báo không tìm thấy khi RPC ném bid_not_found', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'bid_not_found', code: 'P0001' },
    })

    expect(await approveBid(BID_ID, 50_000)).toEqual({
      ok: false,
      error: 'Không tìm thấy lượt bid.',
    })
  })

  it('không báo thành công khi RPC hỏng vì lý do khác', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint', code: '23505' },
    })

    expect(await approveBid(BID_ID, 50_000)).toEqual({
      ok: false,
      error: 'Không duyệt được lượt bid. Thử lại sau.',
    })
  })

  it('ném lỗi khi chưa đăng nhập, không chạm tới database', async () => {
    isAdmin.mockResolvedValue(false)

    await expect(approveBid(BID_ID, 50_000)).rejects.toThrow('Không có quyền truy cập.')
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('rejectBid', () => {
  it('đổi trạng thái sang rejected khi bid còn chờ duyệt', async () => {
    from.mockReturnValue(mockChain({ data: [{ id: BID_ID }], error: null }))

    expect(await rejectBid(BID_ID, ' không nhận được tiền ')).toEqual({
      ok: true,
      data: null,
    })
    expect(from).toHaveBeenCalledWith('bids')
  })

  it('chặn duyệt/từ chối lần hai khi UPDATE không khớp dòng nào', async () => {
    from.mockReturnValue(mockChain({ data: [], error: null }))

    expect(await rejectBid(BID_ID, 'lý do')).toEqual({
      ok: false,
      error: 'Lượt bid này đã được xử lý.',
    })
  })

  it('ném lỗi khi chưa đăng nhập', async () => {
    isAdmin.mockResolvedValue(false)
    await expect(rejectBid(BID_ID, 'lý do')).rejects.toThrow('Không có quyền truy cập.')
  })
})

describe('toggleProfileHidden', () => {
  const PROFILE_ID = '22222222-2222-2222-2222-222222222222'

  it('ẩn profile thành công', async () => {
    from.mockReturnValue(mockChain({ data: null, error: null }))

    expect(await toggleProfileHidden(PROFILE_ID, true)).toEqual({ ok: true, data: null })
    expect(from).toHaveBeenCalledWith('profiles')
  })

  it('trả lỗi khi database từ chối', async () => {
    from.mockReturnValue(mockChain({ data: null, error: { message: 'boom' } }))

    expect(await toggleProfileHidden(PROFILE_ID, false)).toEqual({
      ok: false,
      error: 'Không cập nhật được profile.',
    })
  })

  it('ném lỗi khi chưa đăng nhập', async () => {
    isAdmin.mockResolvedValue(false)
    await expect(toggleProfileHidden(PROFILE_ID, true)).rejects.toThrow(
      'Không có quyền truy cập.',
    )
  })
})

describe('loginAdmin', () => {
  it('đặt cookie phiên khi mật khẩu đúng', async () => {
    expect(await loginAdmin('mat-khau-dung')).toEqual({ ok: true, data: null })
    expect(cookieStore.set).toHaveBeenCalled()
  })

  it('từ chối mật khẩu sai mà không đặt cookie', async () => {
    expect(await loginAdmin('sai')).toEqual({ ok: false, error: 'Mật khẩu không đúng.' })
    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  it('từ chối mật khẩu sai có độ dài khác (timingSafeEqual không được ném)', async () => {
    expect(await loginAdmin('')).toEqual({ ok: false, error: 'Mật khẩu không đúng.' })
    expect(await loginAdmin('mat-khau-dung-nhung-dai-hon')).toEqual({
      ok: false,
      error: 'Mật khẩu không đúng.',
    })
  })

  it('chặn từ lần thử thứ 6 trở đi trong cùng cửa sổ', async () => {
    for (let i = 0; i < 5; i++) {
      expect(await loginAdmin('sai')).toEqual({ ok: false, error: 'Mật khẩu không đúng.' })
    }

    expect(await loginAdmin('sai')).toEqual({
      ok: false,
      error: 'Quá nhiều lần thử. Vui lòng thử lại sau.',
    })
    // Hết hạn mức thì mật khẩu đúng cũng không lọt.
    expect(await loginAdmin('mat-khau-dung')).toEqual({
      ok: false,
      error: 'Quá nhiều lần thử. Vui lòng thử lại sau.',
    })
    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  it('xoá bộ đếm sau khi đăng nhập thành công', async () => {
    for (let i = 0; i < 4; i++) await loginAdmin('sai')

    expect(await loginAdmin('mat-khau-dung')).toEqual({ ok: true, data: null })

    // Sau khi reset, lại có đủ 5 lượt mới chứ không dính hạn mức cũ.
    for (let i = 0; i < 5; i++) {
      expect(await loginAdmin('sai')).toEqual({ ok: false, error: 'Mật khẩu không đúng.' })
    }
  })
})
