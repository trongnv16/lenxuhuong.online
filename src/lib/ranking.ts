import type { Profile } from '@/lib/types'

export const PAGE_SIZE = 10

export type Rankable = Pick<Profile, 'id' | 'amount' | 'first_ranked_at' | 'is_hidden'>

export function sortForLeaderboard<T extends Rankable>(profiles: T[]): T[] {
  return profiles
    .filter((p) => !p.is_hidden)
    .slice()
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount
      return a.first_ranked_at.localeCompare(b.first_ranked_at)
    })
}

// Số tiền bằng nhau xếp sau người đã đứng sẵn, nên dùng so sánh chặt.
export function predictRank(amount: number, sorted: Rankable[]): number {
  let rank = 1
  for (const p of sorted) {
    if (p.amount >= amount) rank += 1
    else break
  }
  return rank
}

export function amountToBeat(
  targetRank: number,
  sorted: Rankable[],
  step: number,
): number {
  const occupant = sorted[targetRank - 1]
  if (!occupant) return step
  return occupant.amount + step
}

export function paginate<T>(
  items: T[],
  page: number,
): { items: T[]; totalPages: number; page: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  return {
    items: items.slice(start, start + PAGE_SIZE),
    totalPages,
    page: safePage,
  }
}
