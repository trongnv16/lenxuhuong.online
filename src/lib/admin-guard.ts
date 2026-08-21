import 'server-only'
import { cookies } from 'next/headers'
import { getServerEnv } from '@/lib/env'
import { ADMIN_COOKIE_NAME, verifySession } from '@/lib/admin-session'

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value
  return verifySession(token, getServerEnv().adminSessionSecret)
}
