import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, resetRateLimit, clearAllRateLimits } from '@/lib/rate-limit'

const OPTS = { max: 3, windowMs: 1000 }
const NOW = 1_800_000_000_000

beforeEach(() => {
  clearAllRateLimits()
})

describe('checkRateLimit', () => {
  it('cho qua đúng max lần rồi chặn', () => {
    expect(checkRateLimit('a', OPTS, NOW)).toBe(true)
    expect(checkRateLimit('a', OPTS, NOW)).toBe(true)
    expect(checkRateLimit('a', OPTS, NOW)).toBe(true)
    expect(checkRateLimit('a', OPTS, NOW)).toBe(false)
  })

  it('đếm riêng cho từng key', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', OPTS, NOW)

    expect(checkRateLimit('a', OPTS, NOW)).toBe(false)
    expect(checkRateLimit('b', OPTS, NOW)).toBe(true)
  })

  it('mở lại hạn mức khi qua hết cửa sổ', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', OPTS, NOW)
    expect(checkRateLimit('a', OPTS, NOW)).toBe(false)

    expect(checkRateLimit('a', OPTS, NOW + 1001)).toBe(true)
  })

  it('vẫn chặn ở đúng thời điểm cuối cửa sổ', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', OPTS, NOW)
    expect(checkRateLimit('a', OPTS, NOW + 999)).toBe(false)
  })
})

describe('resetRateLimit', () => {
  it('trả lại đủ hạn mức cho key đã bị chặn', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', OPTS, NOW)
    expect(checkRateLimit('a', OPTS, NOW)).toBe(false)

    resetRateLimit('a')
    expect(checkRateLimit('a', OPTS, NOW)).toBe(true)
  })

  it('không đụng tới key khác', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('b', OPTS, NOW)
    resetRateLimit('a')
    expect(checkRateLimit('b', OPTS, NOW)).toBe(false)
  })
})
