import { Leaderboard } from '@/components/leaderboard'
import { HomeBidForm } from '@/components/home-bid-form'
import { AutoRefresh } from '@/components/auto-refresh'
import { fetchVisibleProfiles } from '@/lib/queries'
import { sortForLeaderboard, amountToBeat } from '@/lib/ranking'
import { BID_STEP } from '@/lib/money'
import { getServerEnv } from '@/lib/env'

export default async function Page(props: PageProps<'/'>) {
  const searchParams = await props.searchParams
  const pageParam = searchParams.page
  const page = Number(Array.isArray(pageParam) ? pageParam[0] : (pageParam ?? 1))
  const urlParam = searchParams.url
  const initialUrl = Array.isArray(urlParam) ? (urlParam[0] ?? '') : (urlParam ?? '')

  const profiles = sortForLeaderboard(await fetchVisibleProfiles())
  const minAmount = getServerEnv().minBidAmount
  const priceForTop = Math.max(amountToBeat(1, profiles, BID_STEP), minAmount)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-8 sm:py-12">
      <div className="flex items-center gap-2.5">
        <img src="/social_icon/xuhuong.png" alt="" width={36} height={36} className="h-9 w-9" aria-hidden="true" />
        <div className="text-[22px] font-bold tracking-[-0.01em]">
          lên<span className="text-primary">xuhướng</span>
          <span className="font-medium text-ink-muted">.online</span>
        </div>
      </div>

      <div className="flex max-w-[600px] flex-col gap-3 text-center">
        <p className="text-[clamp(18px,2.4vw,22px)] font-semibold leading-snug">
          Giữ hạng 1 của bạn trên <span className="text-primary">xuhuong.online</span>
        </p>
      </div>

      <AutoRefresh />

      <HomeBidForm
        minAmount={minAmount}
        priceForTop={priceForTop}
        initialUrl={initialUrl}
        rankable={profiles}
      />

      <div className="mt-1.5 h-px w-full bg-line" />

      <Leaderboard profiles={profiles} page={page} />

      <p className="mt-5 text-center text-xs text-ink-muted">
        © 2026 xuhuong.online - j4f
      </p>
    </main>
  )
}
