import { describe, it, expect } from 'vitest'
import { generateRefCode, isValidRefCode, REF_CODE_ALPHABET } from '@/lib/ref-code'

describe('REF_CODE_ALPHABET', () => {
  it('không chứa ký tự dễ nhầm', () => {
    for (const ch of ['0', 'O', '1', 'I', 'L']) {
      expect(REF_CODE_ALPHABET).not.toContain(ch)
    }
  })
})

describe('generateRefCode', () => {
  it('bắt đầu bằng LXH và dài 9 ký tự', () => {
    const code = generateRefCode()
    expect(code).toMatch(/^LXH/)
    expect(code).toHaveLength(9)
  })

  it('chỉ dùng ký tự trong bộ cho phép', () => {
    for (let i = 0; i < 200; i++) {
      const body = generateRefCode().slice(3)
      for (const ch of body) {
        expect(REF_CODE_ALPHABET).toContain(ch)
      }
    }
  })

  it('sinh ra giá trị khác nhau', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateRefCode()))
    expect(codes.size).toBeGreaterThan(490)
  })
})

describe('isValidRefCode', () => {
  it('chấp nhận mã do chính hàm sinh ra', () => {
    expect(isValidRefCode(generateRefCode())).toBe(true)
  })

  it('từ chối mã sai định dạng', () => {
    expect(isValidRefCode('ABC123456')).toBe(false)
    expect(isValidRefCode('LXH12')).toBe(false)
    expect(isValidRefCode('LXHAAAAAA0')).toBe(false)
    expect(isValidRefCode('')).toBe(false)
    expect(isValidRefCode('LXH0OIL12')).toBe(false)
  })
})
