import { describe, it, expect } from 'vitest'
import { canTransition, assertTransition } from '@/lib/bid-status'

describe('canTransition', () => {
  it('cho phép pending sang awaiting_review', () => {
    expect(canTransition('pending', 'awaiting_review')).toBe(true)
  })

  it('cho phép awaiting_review sang approved hoặc rejected', () => {
    expect(canTransition('awaiting_review', 'approved')).toBe(true)
    expect(canTransition('awaiting_review', 'rejected')).toBe(true)
  })

  it('chặn duyệt hai lần', () => {
    expect(canTransition('approved', 'approved')).toBe(false)
    expect(canTransition('approved', 'rejected')).toBe(false)
  })

  it('chặn duyệt bid đã bị từ chối', () => {
    expect(canTransition('rejected', 'approved')).toBe(false)
  })

  it('chặn duyệt thẳng từ pending, phải qua awaiting_review', () => {
    expect(canTransition('pending', 'approved')).toBe(false)
  })

  it('chặn quay ngược trạng thái', () => {
    expect(canTransition('awaiting_review', 'pending')).toBe(false)
  })
})

describe('assertTransition', () => {
  it('không ném lỗi khi hợp lệ', () => {
    expect(() => assertTransition('awaiting_review', 'approved')).not.toThrow()
  })

  it('ném lỗi nêu rõ hai trạng thái khi không hợp lệ', () => {
    expect(() => assertTransition('approved', 'approved')).toThrow(/approved/)
  })
})
