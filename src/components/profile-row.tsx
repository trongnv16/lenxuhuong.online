import { PlatformIcon } from '@/components/platform-icon'
import { avatarPublicUrl } from '@/lib/queries'
import { formatVnd } from '@/lib/money'
import type { Profile } from '@/lib/types'

export function ProfileRow({ profile, rank }: { profile: Profile; rank: number }) {
  return (
    <a
      href={profile.social_url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3 transition hover:border-primary"
    >
      <span className="w-8 shrink-0 text-sm font-semibold text-ink-muted">{rank}</span>

      <img
        src={avatarPublicUrl(profile.avatar_path)}
        alt={`Ảnh đại diện của ${profile.display_name}`}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={profile.platform} className="h-4 w-4 shrink-0 text-ink-muted" />
          <span className="truncate font-medium">{profile.display_name}</span>
        </div>
        <p className="truncate text-sm text-ink-muted">{profile.bio}</p>
      </div>

      <span className="shrink-0 font-semibold text-primary">{formatVnd(profile.amount)}</span>
    </a>
  )
}
