import { describe, it, expect, vi, afterEach } from 'vitest'
import { escapeHtml, buildBidNotification, sendBidNotification } from '@/lib/telegram'

const input = {
  refCode: 'LXHAB2345',
  amount: 50000,
  displayName: 'Linh Ka',
  platform: 'tiktok' as const,
  socialUrl: 'https://tiktok.com/@linhka',
  predictedRank: 2,
}

describe('escapeHtml', () => {
  it('thoát các ký tự HTML', () => {
    expect(escapeHtml('<b>đậm</b>')).toBe('&lt;b&gt;đậm&lt;/b&gt;')
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('thoát dấu & trước để không thoát hai lần', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('giữ nguyên chữ tiếng Việt có dấu', () => {
    expect(escapeHtml('Nguyễn Văn Trọng')).toBe('Nguyễn Văn Trọng')
  })
})

describe('buildBidNotification', () => {
  it('chứa mã tham chiếu, số tiền và tên', () => {
    const msg = buildBidNotification(input)
    expect(msg).toContain('LXHAB2345')
    expect(msg).toContain('50.000đ')
    expect(msg).toContain('Linh Ka')
  })

  it('chứa vị trí dự kiến và link', () => {
    const msg = buildBidNotification(input)
    expect(msg).toContain('2')
    expect(msg).toContain('https://tiktok.com/@linhka')
  })

  it('thoát HTML trong tên người dùng nhập', () => {
    const msg = buildBidNotification({ ...input, displayName: '<b>hack</b>' })
    expect(msg).toContain('&lt;b&gt;hack&lt;/b&gt;')
    expect(msg).not.toContain('<b>hack</b>')
  })
})

describe('sendBidNotification', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  function stubEnv() {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'token')
    vi.stubEnv('TELEGRAM_CHAT_ID', '123')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
    vi.stubEnv('ADMIN_PASSWORD', 'pw')
    vi.stubEnv('ADMIN_SESSION_SECRET', 'secret')
    vi.stubEnv('BANK_ACCOUNT_NUMBER', '0123456789')
    vi.stubEnv('BANK_CODE', 'ACB')
    vi.stubEnv('BANK_ACCOUNT_NAME', 'NGUYEN VAN A')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://lenxuhuong.online')
  }

  it('trả true khi Telegram trả về thành công', async () => {
    stubEnv()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    expect(await sendBidNotification(input)).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/bottoken/sendMessage')
    expect(JSON.parse(init.body).parse_mode).toBe('HTML')
  })

  it('trả false thay vì ném lỗi khi mạng hỏng', async () => {
    stubEnv()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('mạng hỏng')))
    await expect(sendBidNotification(input)).resolves.toBe(false)
  })

  it('trả false khi Telegram trả về lỗi HTTP', async () => {
    stubEnv()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }))
    expect(await sendBidNotification(input)).toBe(false)
  })

  it('trả false thay vì ném lỗi khi thiếu biến môi trường', async () => {
    vi.stubGlobal('fetch', vi.fn())
    await expect(sendBidNotification(input)).resolves.toBe(false)
  })
})
