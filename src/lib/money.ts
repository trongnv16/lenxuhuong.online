export const BID_STEP = 100

export type BidAmountError = {
  code: 'not_integer' | 'below_min' | 'not_step' | 'not_higher_than_own'
  message: string
}

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export function validateBidAmount(
  amount: number,
  opts: { minAmount: number; currentProfileAmount?: number | null },
): BidAmountError | null {
  if (!Number.isInteger(amount)) {
    return { code: 'not_integer', message: 'Số tiền phải là số nguyên.' }
  }

  if (amount < opts.minAmount) {
    return {
      code: 'below_min',
      message: `Số tiền tối thiểu là ${formatVnd(opts.minAmount)}.`,
    }
  }

  if (amount % BID_STEP !== 0) {
    return {
      code: 'not_step',
      message: `Số tiền phải là bội số của ${formatVnd(BID_STEP)}.`,
    }
  }

  const current = opts.currentProfileAmount
  if (current != null && amount <= current) {
    return {
      code: 'not_higher_than_own',
      message: `Bạn đang ở mức ${formatVnd(current)}. Cần trả cao hơn để đổi hạng.`,
    }
  }

  return null
}
