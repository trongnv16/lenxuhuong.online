import Link from 'next/link'
import { ProfileRow } from '@/components/profile-row'
import { paginate, PAGE_SIZE } from '@/lib/ranking'
import type { Profile } from '@/lib/types'

export function Leaderboard({
  profiles,
  page,
}: {
  profiles: Profile[]
  page: number
}) {
  const result = paginate(profiles, page)
  const offset = (result.page - 1) * PAGE_SIZE

  if (profiles.length === 0) {
    return (
      <p className="w-full rounded-xl border border-line bg-surface-muted px-4 py-10 text-center text-ink-muted">
        Bảng đang trống. Bạn có thể là người đầu tiên.
      </p>
    )
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-[13.5px] font-semibold transition hover:border-primary"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-3.02-6.7" />
            <path d="M21 4v6h-6" />
          </svg>
          Làm mới
        </Link>

        {result.totalPages > 1 && (
          <nav className="flex items-center gap-1.5" aria-label="Phân trang">
            {result.page > 1 && (
              <Link
                href={`/?page=${result.page - 1}`}
                aria-label="Trang trước"
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
            )}
            {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={`/?page=${n}`}
                aria-current={n === result.page ? 'page' : undefined}
                className={`flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] font-bold transition ${
                  n === result.page
                    ? 'bg-primary text-white'
                    : 'text-ink-muted hover:bg-surface-muted'
                }`}
              >
                {n}
              </Link>
            ))}
            {result.page < result.totalPages && (
              <Link
                href={`/?page=${result.page + 1}`}
                aria-label="Trang sau"
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-muted"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            )}
          </nav>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {result.items.map((p, i) => (
          <ProfileRow key={p.id} profile={p} rank={offset + i + 1} />
        ))}
      </div>
    </div>
  )
}
