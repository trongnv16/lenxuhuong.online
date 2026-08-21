import type { Platform } from '@/lib/types'

export type NormalizedSocial = {
  url: string
  platform: Platform
  handle: string | null
}

const HOST_ALIASES: Record<string, string> = {
  'fb.com': 'facebook.com',
  'm.facebook.com': 'facebook.com',
  'twitter.com': 'x.com',
  'threads.net': 'threads.com',
  'youtu.be': 'youtube.com',
  'm.youtube.com': 'youtube.com',
}

const PLATFORM_BY_HOST: Record<string, Platform> = {
  'tiktok.com': 'tiktok',
  'vt.tiktok.com': 'tiktok',
  'vm.tiktok.com': 'tiktok',
  'facebook.com': 'facebook',
  'instagram.com': 'instagram',
  'threads.com': 'threads',
  'x.com': 'x',
  'youtube.com': 'youtube',
}

// Nền tảng dùng đường dẫn dạng /@handle hoặc /handle làm tên người dùng.
const HANDLE_HOSTS = new Set([
  'tiktok.com',
  'facebook.com',
  'instagram.com',
  'threads.com',
  'x.com',
  'youtube.com',
])

function extractHandle(host: string, pathname: string): string | null {
  if (!HANDLE_HOSTS.has(host)) return null
  const first = pathname.split('/').filter(Boolean)[0]
  if (!first) return null
  return first.startsWith('@') ? first : `@${first}`
}

export function normalizeSocialUrl(input: string): NormalizedSocial | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    return null
  }

  // Hostname phải có ít nhất một dấu chấm, nếu không thì đó là chuỗi tự do.
  if (!parsed.hostname.includes('.')) return null

  let host = parsed.hostname.toLowerCase().replace(/^www\./, '')
  host = HOST_ALIASES[host] ?? host

  const platform = PLATFORM_BY_HOST[host] ?? 'other'
  const pathname = parsed.pathname.replace(/\/+$/, '')
  const handle = platform === 'other' ? null : extractHandle(host, pathname)

  // Giữ lại id param cho Facebook profile.php để tránh trùng khoá
  const isFacebookProfilePhp = host === 'facebook.com' && pathname === '/profile.php'
  const idParam = isFacebookProfilePhp ? parsed.searchParams.get('id') : null
  const query = idParam ? `?id=${idParam}` : ''

  return {
    url: `https://${host}${pathname}${query}`,
    platform,
    handle,
  }
}
