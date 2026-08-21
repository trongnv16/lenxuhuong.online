import { describe, it, expect } from 'vitest'
import {
  signSession,
  verifySession,
  ADMIN_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/admin-session'

const SECRET = 'sieu-bi-mat'
const NOW = 1_800_000_000_000

describe('hằng số phiên', () => {
  it('tên cookie và hạn 7 ngày', () => {
    expect(ADMIN_COOKIE_NAME).toBe('lxh_admin')
    expect(SESSION_MAX_AGE_SECONDS).toBe(604800)
  })
})

describe('signSession và verifySession', () => {
  it('xác minh được token do chính nó ký', () => {
    const token = signSession(NOW + 1000, SECRET)
    expect(verifySession(token, SECRET, NOW)).toBe(true)
  })

  it('từ chối token đã hết hạn', () => {
    const token = signSession(NOW - 1, SECRET)
    expect(verifySession(token, SECRET, NOW)).toBe(false)
  })

  it('từ chối token ký bằng secret khác', () => {
    const token = signSession(NOW + 1000, 'secret-khac')
    expect(verifySession(token, SECRET, NOW)).toBe(false)
  })

  it('từ chối token bị sửa phần hạn để kéo dài', () => {
    const token = signSession(NOW + 1000, SECRET)
    const [, sig] = token.split('.')
    expect(verifySession(`${NOW + 999999}.${sig}`, SECRET, NOW)).toBe(false)
  })

  it('từ chối token rỗng, undefined hoặc sai định dạng', () => {
    expect(verifySession(undefined, SECRET, NOW)).toBe(false)
    expect(verifySession('', SECRET, NOW)).toBe(false)
    expect(verifySession('khong-co-dau-cham', SECRET, NOW)).toBe(false)
    expect(verifySession('abc.def', SECRET, NOW)).toBe(false)
  })
})
