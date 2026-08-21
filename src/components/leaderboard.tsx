import Link from 'next/link'
import { ProfileCard } from '@/components/profile-card'
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
      <p className="rounded-xl border border-line bg-surface-muted px-4 py-10 text-center text-ink-muted">
        Bảng đang trống. Bạn có thể là người đầu tiên.
      </p>
    )
  }

  // Bục vinh danh chỉ hiện ở trang 1; các trang sau chỉ là danh sách thường.
  const podium = result.page === 1 ? result.items.slice(0, 3) : []
  const rows = result.page === 1 ? result.items.slice(3) : result.items
  const rowsStartRank = offset + podium.length + 1

  return (
    <div className="flex flex-col gap-8">
      {podium.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {podium.map((p, i) => (
            <ProfileCard key={p.id} profile={p} rank={i + 1} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {rows.map((p, i) => (
            <ProfileRow key={p.id} profile={p} rank={rowsStartRank + i} />
          ))}
        </div>
      )}

      {result.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Phân trang">
          {result.page > 1 && (
            <Link
              href={`/?page=${result.page - 1}`}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:border-primary"
            >
              Trang trước
            </Link>
          )}
          <span className="text-sm text-ink-muted">
            Trang {result.page} / {result.totalPages}
          </span>
          {result.page < result.totalPages && (
            <Link
              href={`/?page=${result.page + 1}`}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:border-primary"
            >
              Trang sau
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
