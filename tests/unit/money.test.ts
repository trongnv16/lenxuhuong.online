import { describe, it, expect } from 'vitest'
import { formatVnd, validateBidAmount, BID_STEP } from '@/lib/money'

describe('formatVnd', () => {
  it('chèn dấu chấm phân cách hàng nghìn', () => {
    expect(formatVnd(1000)).toBe('1.000đ')
    expect(formatVnd(50000)).toBe('50.000đ')
    expect(formatVnd(1234000)).toBe('1.234.000đ')
  })

  it('xử lý số không', () => {
    expect(formatVnd(0)).toBe('0đ')
  })
})

describe('validateBidAmount', () => {
  const opts = { minAmount: 1000 }

  it('chấp nhận số hợp lệ', () => {
    expect(validateBidAmount(1000, opts)).toBeNull()
    expect(validateBidAmount(50000, opts)).toBeNull()
  })

  it('từ chối số không nguyên', () => {
    expect(validateBidAmount(1000.5, opts)?.code).toBe('not_integer')
    expect(validateBidAmount(NaN, opts)?.code).toBe('not_integer')
  })

  it('từ chối số dưới giá sàn', () => {
    const err = validateBidAmount(500, opts)
    expect(err?.code).toBe('below_min')
    expect(err?.message).toContain('1.000đ')
  })

  it('tôn trọng giá sàn tuỳ chỉnh', () => {
    expect(validateBidAmount(10000, { minAmount: 20000 })?.code).toBe('below_min')
    expect(validateBidAmount(20000, { minAmount: 20000 })).toBeNull()
  })

  it('từ chối số không phải bội số 1000', () => {
    expect(validateBidAmount(1500, opts)?.code).toBe('not_step')
  })

  it('từ chối bid không cao hơn mức hiện tại của chính profile', () => {
    const err = validateBidAmount(50000, { minAmount: 1000, currentProfileAmount: 50000 })
    expect(err?.code).toBe('not_higher_than_own')
    expect(err?.message).toContain('50.000đ')

    expect(
      validateBidAmount(49000, { minAmount: 1000, currentProfileAmount: 50000 })?.code,
    ).toBe('not_higher_than_own')
  })

  it('chấp nhận bid cao hơn mức hiện tại', () => {
    expect(
      validateBidAmount(51000, { minAmount: 1000, currentProfileAmount: 50000 }),
    ).toBeNull()
  })

  it('bỏ qua kiểm tra khi profile chưa tồn tại', () => {
    expect(validateBidAmount(1000, { minAmount: 1000, currentProfileAmount: null })).toBeNull()
  })

  it('bước nhảy là 1000', () => {
    expect(BID_STEP).toBe(1000)
  })
})
