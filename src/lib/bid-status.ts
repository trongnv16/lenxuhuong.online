import type { BidStatus } from '@/lib/types'

const ALLOWED: Record<BidStatus, BidStatus[]> = {
  pending: ['awaiting_review'],
  awaiting_review: ['approved', 'rejected'],
  approved: [],
  rejected: [],
}

export function canTransition(from: BidStatus, to: BidStatus): boolean {
  return ALLOWED[from].includes(to)
}

export function assertTransition(from: BidStatus, to: BidStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Không thể chuyển trạng thái bid từ "${from}" sang "${to}".`)
  }
}
