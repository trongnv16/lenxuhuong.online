import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getServerEnv } from '@/lib/env'

const REQUIRED = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  ADMIN_PASSWORD: 'pw',
  ADMIN_SESSION_SECRET: 'secret',
  TELEGRAM_BOT_TOKEN: 'token',
  TELEGRAM_CHAT_ID: '123',
  BANK_ACCOUNT_NUMBER: '0123456789',
  BANK_CODE: 'ACB',
  BANK_ACCOUNT_NAME: 'NGUYEN VAN A',
  NEXT_PUBLIC_SITE_URL: 'https://lenxuhuong.online',
}

let saved: NodeJS.ProcessEnv

beforeEach(() => {
  saved = { ...process.env }
  for (const [k, v] of Object.entries(REQUIRED)) process.env[k] = v
  delete process.env.MIN_BID_AMOUNT
})

afterEach(() => {
  process.env = saved
})

describe('getServerEnv', () => {
  it('đọc đủ các biến bắt buộc', () => {
    const env = getServerEnv()
    expect(env.supabaseUrl).toBe('https://x.supabase.co')
    expect(env.adminPassword).toBe('pw')
    expect(env.bankCode).toBe('ACB')
  })

  it('mặc định giá sàn là 1000 khi không đặt MIN_BID_AMOUNT', () => {
    expect(getServerEnv().minBidAmount).toBe(1000)
  })

  it('đọc MIN_BID_AMOUNT khi có', () => {
    process.env.MIN_BID_AMOUNT = '20000'
    expect(getServerEnv().minBidAmount).toBe(20000)
  })

  it('ném lỗi nêu rõ tên biến bị thiếu', () => {
    delete process.env.ADMIN_PASSWORD
    expect(() => getServerEnv()).toThrow(/ADMIN_PASSWORD/)
  })

  it('ném lỗi khi MIN_BID_AMOUNT là chuỗi rỗng', () => {
    process.env.MIN_BID_AMOUNT = ''
    expect(() => getServerEnv()).toThrow(/MIN_BID_AMOUNT/)
  })

  it('ném lỗi khi MIN_BID_AMOUNT không phải số', () => {
    process.env.MIN_BID_AMOUNT = '1O00'
    expect(() => getServerEnv()).toThrow(/MIN_BID_AMOUNT/)
  })
})
