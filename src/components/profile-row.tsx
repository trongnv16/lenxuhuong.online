import { avatarPublicUrl } from '@/lib/queries'
import { formatVnd } from '@/lib/money'
import { timeAgo } from '@/lib/time'
import { AvatarImage } from '@/components/avatar-image'
import { PlatformIcon } from '@/components/platform-icon'
import { ClickTrackingLink } from '@/components/click-tracking-link'
import type { Profile } from '@/lib/types'

// Bảng màu xoay vòng cho avatar rỗng (chưa có ảnh) của hạng 4 trở đi — khớp
// palette 4 màu trong thiết kế gốc, không liên quan tới platform hay rank.
const AVATAR_PALETTE = [
  { bg: '#E3ECFD', fg: '#3C5FC4' },
  { bg: '#E4F3F0', fg: '#2C8571' },
  { bg: '#F3E9FB', fg: '#7B4FA6' },
  { bg: '#FBEEE3', fg: '#B36A3C' },
]

const TIER_STYLE: Record<number, { rankColor: string; cardBg: string; cardBorder: string }> = {
  1: { rankColor: '#C2410C', cardBg: '#EAF0FC', cardBorder: '#94AEE8' },
  2: { rankColor: '#3E63C2', cardBg: '#F3F6FD', cardBorder: '#AEC2ED' },
  3: { rankColor: '#2C4A96', cardBg: '#F8FAFD', cardBorder: '#C7D3EC' },
}

export function ProfileRow({ profile, rank }: { profile: Profile; rank: number }) {
  const tier = TIER_STYLE[rank]
  const palette = AVATAR_PALETTE[(rank - 1) % AVATAR_PALETTE.length]

  return (
    <ClickTrackingLink
      href={profile.social_url}
      profileId={profile.id}
      className={`relative flex items-start gap-3.5 rounded-[18px] px-[18px] py-4 transition hover:shadow-sm sm:items-center ${
        tier ? 'border-2' : 'border'
      }`}
      style={{
        background: tier?.cardBg ?? '#FFFFFF',
        borderColor: tier?.cardBorder ?? 'var(--color-line)',
      }}
    >
      <div className="flex shrink-0 flex-col items-center gap-1 sm:flex-row sm:gap-3.5">
        <span
          className="text-[13px] font-extrabold tabular-nums sm:text-[14.5px]"
          style={{ color: tier?.rankColor ?? 'var(--color-ink-muted)' }}
        >
          #{rank}
        </span>

        <AvatarImage
          src={avatarPublicUrl(profile.avatar_path)}
          alt={`Ảnh đại diện của ${profile.display_name}`}
          background={palette.bg}
          foreground={palette.fg}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <PlatformIcon
              platform={profile.platform}
              className="shrink-0 text-ink-muted"
            />
            <span className="truncate font-bold">{profile.display_name}</span>
            {rank === 1 && (
              <span
                className="hidden shrink-0 rounded-full bg-surface px-[9px] py-0.5 text-[10.5px] font-bold text-primary-strong sm:inline-flex"
              >
                ĐANG GIỮ HẠNG 1
              </span>
            )}
            {rank === 1 && (
              <svg
                width="23"
                height="23"
                viewBox="3 4 18 18"
                fill="#EA580C"
                className="shrink-0 self-center sm:hidden"
                aria-label="Đang giữ hạng 1"
              >
              <path d="M5 19h14v2H5v-2Zm.5-2 -1.5-9 5 3 3-5 3 5 5-3-1.5 9h-13Z" />
              </svg>
            )}
          </span>
          <span className="shrink-0 text-base font-extrabold text-primary-strong">
            {formatVnd(profile.amount)}
          </span>
        </div>

        {profile.bio && <p className="mt-1 text-[13.5px] text-ink-muted">{profile.bio}</p>}
        <p className="mt-1 truncate text-xs text-ink-muted">
          {timeAgo(profile.ranked_at)}
          {profile.click_count > 0 && (
            <>
              {' · '}
              <span className="font-bold text-orange-600">
                {profile.click_count.toLocaleString('vi-VN')} click
              </span>
            </>
          )}
        </p>
      </div>
    </ClickTrackingLink>
  )
}
