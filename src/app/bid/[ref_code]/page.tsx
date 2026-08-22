import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clock, Check, X } from 'lucide-react'
import { fetchBidByRefCode } from '@/lib/queries'
import { buildVietQrUrl } from '@/lib/vietqr'
import { formatVnd } from '@/lib/money'
import { getServerEnv } from '@/lib/env'
import { SubmitPaymentPanel } from '@/components/bid-form/submit-payment-panel'
import { BidStatusPoller } from '@/components/bid-form/bid-status-poller'

export const metadata: Metadata = {
  title: 'Trạng thái lượt bid',
}

export default async function Page(props: PageProps<'/bid/[ref_code]'>) {
  const { ref_code: refCode } = await props.params
  const bid = await fetchBidByRefCode(refCode)
  if (!bid) notFound()

  const env = getServerEnv()

  if (bid.status === 'pending') {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-10">
        <h1 className="text-2xl font-bold">Chuyển khoản để hoàn tất</h1>

        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface-muted p-6">
          <img
            src={buildVietQrUrl({ amount: bid.amount, refCode: bid.ref_code })}
            alt="Mã QR chuyển khoản"
            className="w-64 rounded-xl bg-white"
          />
          <dl className="w-full text-sm">
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-ink-muted">Số tiền</dt>
              <dd className="font-semibold">{formatVnd(bid.amount)}</dd>
            </div>
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-ink-muted">Ngân hàng</dt>
              <dd className="font-medium">{env.bankCode}</dd>
            </div>
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-ink-muted">Số tài khoản</dt>
              <dd className="font-medium">{env.bankAccountNumber}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-ink-muted">Chủ tài khoản</dt>
              <dd className="font-medium">{env.bankAccountName}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-danger">
            Bắt buộc ghi đúng nội dung chuyển khoản
          </p>
          <p className="mt-2 text-2xl font-bold tracking-wider">{bid.ref_code}</p>
          <p className="mt-1 text-sm text-ink-muted">
            Ghi sai nội dung sẽ không đối soát được lượt bid của bạn.
          </p>
        </div>

        <SubmitPaymentPanel refCode={bid.ref_code} />

        <p className="mt-6 text-sm text-ink-muted">
          Lưu lại đường dẫn này để xem trạng thái duyệt.
        </p>
      </main>
    )
  }

  const state = {
    awaiting_review: {
      icon: <Clock className="h-6 w-6 text-primary" aria-hidden="true" />,
      title: 'Đang xử lý',
      body: 'Chúng tôi đã nhận được xác nhận của bạn. Vui lòng đợi trong khoảng 1 phút.',
    },
    approved: {
      icon: <Check className="h-6 w-6 text-success" aria-hidden="true" />,
      title: 'Đã lên bảng',
      body: 'Lượt bid của bạn đã được duyệt và hiển thị trên bảng xếp hạng.',
    },
    rejected: {
      icon: <X className="h-6 w-6 text-danger" aria-hidden="true" />,
      title: 'Đã bị từ chối',
      body: bid.reject_reason ?? 'Lượt bid này không được duyệt.',
    },
  }[bid.status]

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      {bid.status === 'awaiting_review' && <BidStatusPoller />}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface-muted p-8 text-center">
        {state.icon}
        <h1 className="text-2xl font-bold">{state.title}</h1>
        <p className="text-ink-muted">{state.body}</p>
        <dl className="mt-4 w-full text-sm">
          <div className="flex justify-between border-t border-line py-2">
            <dt className="text-ink-muted">Mã tham chiếu</dt>
            <dd className="font-medium">{bid.ref_code}</dd>
          </div>
          <div className="flex justify-between border-t border-line py-2">
            <dt className="text-ink-muted">Số tiền</dt>
            <dd className="font-medium">{formatVnd(bid.amount)}</dd>
          </div>
        </dl>
      </div>

      <Link
        href="/"
        className="mt-6 block text-center text-sm text-ink-muted hover:text-primary"
      >
        Về bảng xếp hạng
      </Link>
    </main>
  )
}
