import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildVietQrUrl } from '@/lib/vietqr'

afterEach(() => {
  vi.unstubAllEnvs()
})

function stubEnv() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
  vi.stubEnv('ADMIN_PASSWORD', 'pw')
  vi.stubEnv('ADMIN_SESSION_SECRET', 'secret')
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'token')
  vi.stubEnv('TELEGRAM_CHAT_ID', '123')
  vi.stubEnv('BANK_ACCOUNT_NUMBER', '0123456789')
  vi.stubEnv('BANK_CODE', 'ACB')
  vi.stubEnv('BANK_ACCOUNT_NAME', 'NGUYEN VAN A')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://lenxuhuong.online')
}

describe('buildVietQrUrl', () => {
  it('gắn mã ngân hàng và số tài khoản vào đường dẫn', () => {
    stubEnv()
    const url = buildVietQrUrl({ amount: 50000, refCode: 'LXHAB2345' })
    expect(url).toContain('img.vietqr.io')
    expect(url).toContain('ACB')
    expect(url).toContain('0123456789')
  })

  it('gắn số tiền và nội dung chuyển khoản vào query', () => {
    stubEnv()
    const url = new URL(buildVietQrUrl({ amount: 50000, refCode: 'LXHAB2345' }))
    expect(url.searchParams.get('amount')).toBe('50000')
    expect(url.searchParams.get('addInfo')).toBe('LXHAB2345')
    expect(url.searchParams.get('accountName')).toBe('NGUYEN VAN A')
  })
})
