import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_COOKIE_NAME = 'lxh_admin'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function signSession(expiresAt: number, secret: string): string {
  return `${expiresAt}.${sign(String(expiresAt), secret)}`
}

export function verifySession(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (!token) return false

  const [expiresRaw, signature] = token.split('.')
  if (!expiresRaw || !signature) return false

  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false

  const expected = sign(expiresRaw, secret)
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
