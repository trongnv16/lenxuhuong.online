import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BidReviewCard } from '@/components/admin/bid-review-card'
import { fetchBidsByStatus, avatarPublicUrl, receiptSignedUrl } from '@/lib/queries'
import { isAdmin } from '@/lib/admin-guard'
import type { BidStatus } from '@/lib/types'

const TABS: { status: BidStatus; label: string }[] = [
  { status: 'awaiting_review', label: 'Chờ duyệt' },
  { status: 'approved', label: 'Đã duyệt' },
  { status: 'rejected', label: 'Từ chối' },
]

export default async function Page(props: PageProps<'/admin'>) {
  // Proxy đã chặn, nhưng kiểm tra lại ở đây để không phụ thuộc vào matcher.
  // Trang dùng bản trả về boolean rồi tự chuyển hướng, thay vì để lỗi trần
  // hiện màn hình lỗi của Next.
  if (!(await isAdmin())) redirect('/admin/dang-nhap')

  const searchParams = await props.searchParams
  const raw = searchParams.tab
  const requested = Array.isArray(raw) ? raw[0] : raw
  const status: BidStatus = TABS.some((t) => t.status === requested)
    ? (requested as BidStatus)
    : 'awaiting_review'

  const bids = await fetchBidsByStatus(status)
  const awaiting = status === 'awaiting_review' ? bids : await fetchBidsByStatus('awaiting_review')

  const enriched = await Promise.all(
    bids.map(async (bid) => ({
      bid,
      avatarUrl: avatarPublicUrl(bid.avatar_path),
      receiptUrl: bid.receipt_path ? await receiptSignedUrl(bid.receipt_path) : null,
      pendingSiblingCount: awaiting.filter(
        (b) => b.social_url === bid.social_url && b.id !== bid.id,
      ).length,
    })),
  )

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Duyệt lượt bid</h1>

      <nav className="mt-6 flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.status}
            href={`/admin?tab=${tab.status}`}
            className={`rounded-full border px-4 py-2 text-sm ${
              tab.status === status
                ? 'border-primary bg-primary-soft font-medium text-primary'
                : 'border-line text-ink-muted hover:border-primary'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 flex flex-col gap-4">
        {enriched.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface-muted px-4 py-10 text-center text-ink-muted">
            Không có lượt bid nào ở mục này.
          </p>
        ) : (
          enriched.map((item) => (
            <BidReviewCard
              key={item.bid.id}
              bid={item.bid}
              avatarUrl={item.avatarUrl}
              receiptUrl={item.receiptUrl}
              pendingSiblingCount={item.pendingSiblingCount}
            />
          ))
        )}
      </div>
    </main>
  )
}
