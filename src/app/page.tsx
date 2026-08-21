import { Leaderboard } from '@/components/leaderboard'
import { HomeBidCta } from '@/components/home-bid-cta'
import { fetchVisibleProfiles } from '@/lib/queries'
import { sortForLeaderboard, amountToBeat } from '@/lib/ranking'
import { formatVnd, BID_STEP } from '@/lib/money'
import { getServerEnv } from '@/lib/env'

export default async function Page(props: PageProps<'/'>) {
  const searchParams = await props.searchParams
  const pageParam = searchParams.page
  const page = Number(Array.isArray(pageParam) ? pageParam[0] : (pageParam ?? 1))

  const profiles = sortForLeaderboard(await fetchVisibleProfiles())
  const minAmount = getServerEnv().minBidAmount
  const priceForTop = Math.max(amountToBeat(1, profiles, BID_STEP), minAmount)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">lên xu hướng</h1>
        <p className="max-w-md text-ink-muted">
          Trả tiền để lên bảng. Ai trả cao hơn, người đó đứng trên.
        </p>
      </header>

      <section className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface-muted px-6 py-8 text-center">
        <p className="text-ink-muted">Để chiếm hạng 1 ngay bây giờ</p>
        <p className="text-4xl font-bold text-primary">{formatVnd(priceForTop)}</p>
        <HomeBidCta />
        <p className="text-sm text-ink-muted">
          Trả ít hơn vẫn lên bảng, ở đúng vị trí mà số tiền đó chiếm được.
        </p>
      </section>

      <section className="mt-12">
        <Leaderboard profiles={profiles} page={page} />
      </section>
    </main>
  )
}
