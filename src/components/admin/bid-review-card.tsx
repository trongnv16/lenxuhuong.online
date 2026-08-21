'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveBid, rejectBid, toggleProfileHidden } from '@/actions/admin'
import type { ActionResult } from '@/actions/bid'
import { formatVnd } from '@/lib/money'
import type { Bid } from '@/lib/types'

export function BidReviewCard({
  bid,
  avatarUrl,
  receiptUrl,
  pendingSiblingCount,
}: {
  bid: Bid
  avatarUrl: string
  receiptUrl: string | null
  pendingSiblingCount: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [received, setReceived] = useState(String(bid.amount))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  // ActionResult là union, khi ok:true thì không có thuộc tính error — phải thu
  // hẹp kiểu bằng result.ok chứ không dùng result.error trực tiếp.
  function run(fn: () => Promise<ActionResult<null>>) {
    setError('')
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      {pendingSiblingCount > 0 && (
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-strong">
          Profile này còn {pendingSiblingCount} lượt bid khác đang chờ.
        </p>
      )}

      <div className="flex gap-4">
        <img
          src={avatarUrl}
          alt={`Ảnh đại diện của ${bid.display_name}`}
          className="h-16 w-16 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{bid.display_name}</p>
          <p className="text-sm text-ink-muted">{bid.bio}</p>
          <a
            href={bid.social_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-sm text-primary hover:underline"
          >
            {bid.social_url}
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-ink-muted">Mã tham chiếu</dt>
          <dd className="font-semibold">{bid.ref_code}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Số tiền khai</dt>
          <dd className="font-semibold">{formatVnd(bid.amount)}</dd>
        </div>
      </dl>

      {receiptUrl ? (
        <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={receiptUrl}
            alt="Ảnh chuyển khoản"
            className="max-h-64 rounded-xl border border-line object-contain"
          />
        </a>
      ) : (
        <p className="text-sm text-ink-muted">Người dùng không tải ảnh chuyển khoản.</p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {bid.status === 'approved' && bid.profile_id && (
        <div className="flex gap-2 border-t border-line pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => toggleProfileHidden(bid.profile_id!, true))}
            className="rounded-full border border-danger px-6 py-2.5 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
          >
            Ẩn khỏi bảng
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => toggleProfileHidden(bid.profile_id!, false))}
            className="rounded-full border border-line px-6 py-2.5 text-sm font-medium hover:border-primary disabled:opacity-50"
          >
            Hiện lại
          </button>
        </div>
      )}

      {bid.status === 'awaiting_review' && (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Số tiền thực nhận</span>
            <input
              type="number"
              step={1000}
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-primary"
            />
          </label>

          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => approveBid(bid.id, Number(received)))}
            className="rounded-full bg-primary px-6 py-2.5 font-semibold text-white hover:bg-primary-strong disabled:opacity-50"
          >
            Duyệt
          </button>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Lý do từ chối</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Không nhận được tiền"
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-primary"
            />
          </label>

          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => rejectBid(bid.id, reason))}
            className="rounded-full border border-danger px-6 py-2.5 font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
          >
            Từ chối
          </button>
        </div>
      )}
    </article>
  )
}
