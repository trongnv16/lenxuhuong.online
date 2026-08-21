import { Crown } from 'lucide-react'
import { PlatformIcon } from '@/components/platform-icon'
import { avatarPublicUrl } from '@/lib/queries'
import { formatVnd } from '@/lib/money'
import type { Profile } from '@/lib/types'

const RANK_STYLE: Record<number, string> = {
  1: 'border-primary bg-primary-soft',
  2: 'border-line bg-surface',
  3: 'border-line bg-surface',
}

export function ProfileCard({ profile, rank }: { profile: Profile; rank: number }) {
  return (
    <a
      href={profile.social_url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition hover:shadow-md ${RANK_STYLE[rank] ?? 'border-line bg-surface'}`}
    >
      <div className="flex items-center gap-2">
        {rank === 1 && <Crown className="h-5 w-5 text-primary" aria-hidden="true" />}
        <span className="text-sm font-semibold text-ink-muted">Hạng {rank}</span>
      </div>

      <img
        src={avatarPublicUrl(profile.avatar_path)}
        alt={`Ảnh đại diện của ${profile.display_name}`}
        className={`rounded-full object-cover ${rank === 1 ? 'h-24 w-24' : 'h-20 w-20'}`}
      />

      <div className="flex items-center gap-2">
        <PlatformIcon platform={profile.platform} className="h-4 w-4 text-ink-muted" />
        <span className="font-semibold">{profile.display_name}</span>
      </div>

      <p className="text-sm leading-relaxed text-ink-muted">{profile.bio}</p>

      <span className="text-lg font-bold text-primary">{formatVnd(profile.amount)}</span>
    </a>
  )
}
