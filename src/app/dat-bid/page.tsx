import Link from 'next/link'
import { BidForm } from '@/components/bid-form/bid-form'
import { fetchVisibleProfiles } from '@/lib/queries'
import { sortForLeaderboard } from '@/lib/ranking'
import { getServerEnv } from '@/lib/env'

export default async function Page(props: PageProps<'/dat-bid'>) {
  const searchParams = await props.searchParams
  const urlParam = searchParams.url
  const initialUrl = Array.isArray(urlParam) ? (urlParam[0] ?? '') : (urlParam ?? '')

  const profiles = sortForLeaderboard(await fetchVisibleProfiles())
  const rankable = profiles.map((p) => ({
    id: p.id,
    amount: p.amount,
    first_ranked_at: p.first_ranked_at,
    is_hidden: p.is_hidden,
  }))

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href="/" className="text-sm text-ink-muted hover:text-primary">
        Quay lại bảng xếp hạng
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Lên xu hướng</h1>
      <p className="mt-2 text-ink-muted">
        Điền thông tin, chọn số tiền, rồi chuyển khoản theo mã QR.
      </p>
      <div className="mt-8">
        <BidForm
          rankable={rankable}
          minAmount={getServerEnv().minBidAmount}
          initialUrl={initialUrl}
        />
      </div>
    </main>
  )
}
