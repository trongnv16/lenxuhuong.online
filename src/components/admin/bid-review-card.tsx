'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveBid, rejectBid, toggleProfileHidden } from '@/actions/admin'
import type { ActionResult } from '@/actions/bid'
import { AvatarImage } from '@/components/avatar-image'
import { formatVnd } from '@/lib/money'
import type { Bid } from '@/lib/types'

export function BidReviewCard({
  bid,
  avatarUrl,
  receiptUrl,
  pendingSiblingCount,
}: {
  bid: Bid
  avatarUrl: string | null
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
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      {pendingSiblingCount > 0 && (
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-strong">
          Profile này còn {pendingSiblingCount} lượt bid khác đang chờ.
        </p>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex w-64 shrink-0 gap-3">
          <AvatarImage
            src={avatarUrl}
            alt={`Ảnh đại diện của ${bid.display_name}`}
            background="#E3ECFD"
            foreground="#3C5FC4"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{bid.display_name}</p>
            <p className="truncate text-sm text-ink-muted">{bid.bio}</p>
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

        <dl className="flex shrink-0 gap-4 text-sm">
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
          <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img
              src={receiptUrl}
              alt="Ảnh chuyển khoản"
              className="h-20 w-20 rounded-xl border border-line object-cover"
            />
          </a>
        ) : (
          <p className="w-20 shrink-0 text-xs text-ink-muted">Không có ảnh chuyển khoản.</p>
        )}

        {bid.status === 'approved' && bid.profile_id && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => toggleProfileHidden(bid.profile_id!, true))}
              className="rounded-full border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
            >
              Ẩn khỏi bảng
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => toggleProfileHidden(bid.profile_id!, false))}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-primary disabled:opacity-50"
            >
              Hiện lại
            </button>
          </div>
        )}

        {bid.status === 'awaiting_review' && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink-muted">Số tiền thực nhận</span>
              <input
                type="number"
                step={1000}
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                className="w-36 rounded-lg border border-line px-3 py-2 outline-none focus:border-primary"
              />
            </label>

            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => approveBid(bid.id, Number(received)))}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong disabled:opacity-50"
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
                className="w-44 rounded-lg border border-line px-3 py-2 outline-none focus:border-primary"
              />
            </label>

            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => rejectBid(bid.id, reason))}
              className="rounded-full border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
            >
              Từ chối
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </article>
  )
}
