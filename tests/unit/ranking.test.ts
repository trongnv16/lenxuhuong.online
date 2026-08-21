import { describe, it, expect } from 'vitest'
import {
  sortForLeaderboard,
  predictRank,
  amountToBeat,
  paginate,
  PAGE_SIZE,
} from '@/lib/ranking'

function p(id: string, amount: number, at: string, hidden = false) {
  return { id, amount, first_ranked_at: at, is_hidden: hidden }
}

describe('sortForLeaderboard', () => {
  it('sắp theo số tiền giảm dần', () => {
    const r = sortForLeaderboard([
      p('a', 1000, '2026-01-01'),
      p('b', 50000, '2026-01-02'),
      p('c', 10000, '2026-01-03'),
    ])
    expect(r.map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })

  it('bằng tiền thì ai lên bảng trước xếp trên', () => {
    const r = sortForLeaderboard([
      p('sau', 10000, '2026-03-02T10:00:00Z'),
      p('truoc', 10000, '2026-03-01T10:00:00Z'),
    ])
    expect(r.map((x) => x.id)).toEqual(['truoc', 'sau'])
  })

  it('loại profile bị ẩn', () => {
    const r = sortForLeaderboard([
      p('hien', 5000, '2026-01-01'),
      p('an', 90000, '2026-01-01', true),
    ])
    expect(r.map((x) => x.id)).toEqual(['hien'])
  })

  it('không sửa mảng gốc', () => {
    const input = [p('a', 1000, '2026-01-01'), p('b', 2000, '2026-01-02')]
    sortForLeaderboard(input)
    expect(input.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('xử lý mảng rỗng', () => {
    expect(sortForLeaderboard([])).toEqual([])
  })
})

describe('predictRank', () => {
  const sorted = sortForLeaderboard([
    p('a', 100000, '2026-01-01'),
    p('b', 50000, '2026-01-01'),
    p('c', 10000, '2026-01-01'),
  ])

  it('trả hạng 1 khi cao hơn tất cả', () => {
    expect(predictRank(200000, sorted)).toBe(1)
  })

  it('trả hạng giữa đúng', () => {
    expect(predictRank(60000, sorted)).toBe(2)
    expect(predictRank(20000, sorted)).toBe(3)
  })

  it('trả hạng cuối khi thấp hơn tất cả', () => {
    expect(predictRank(1000, sorted)).toBe(4)
  })

  it('bằng tiền với người đang đứng thì xếp sau họ', () => {
    expect(predictRank(50000, sorted)).toBe(3)
  })

  it('bảng rỗng thì luôn là hạng 1', () => {
    expect(predictRank(1000, [])).toBe(1)
  })
})

describe('amountToBeat', () => {
  const sorted = sortForLeaderboard([
    p('a', 100000, '2026-01-01'),
    p('b', 50000, '2026-01-01'),
    p('c', 10000, '2026-01-01'),
  ])

  it('tính tiền để chiếm hạng 1', () => {
    expect(amountToBeat(1, sorted, 1000)).toBe(101000)
  })

  it('tính tiền để chiếm hạng 2 và 3', () => {
    expect(amountToBeat(2, sorted, 1000)).toBe(51000)
    expect(amountToBeat(3, sorted, 1000)).toBe(11000)
  })

  it('trả bước nhảy khi hạng đó chưa có ai', () => {
    expect(amountToBeat(1, [], 1000)).toBe(1000)
    expect(amountToBeat(4, sorted, 1000)).toBe(1000)
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1)

  it('kích thước trang là 10', () => {
    expect(PAGE_SIZE).toBe(10)
  })

  it('cắt đúng trang 1', () => {
    const r = paginate(items, 1)
    expect(r.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(r.totalPages).toBe(3)
    expect(r.page).toBe(1)
  })

  it('cắt đúng trang cuối chưa đầy', () => {
    expect(paginate(items, 3).items).toEqual([21, 22, 23, 24, 25])
  })

  it('kẹp trang vượt quá về trang cuối', () => {
    expect(paginate(items, 99).page).toBe(3)
  })

  it('kẹp trang nhỏ hơn 1 về trang 1', () => {
    expect(paginate(items, 0).page).toBe(1)
    expect(paginate(items, -5).page).toBe(1)
  })

  it('mảng rỗng có 1 trang', () => {
    const r = paginate([], 1)
    expect(r.items).toEqual([])
    expect(r.totalPages).toBe(1)
  })
})
