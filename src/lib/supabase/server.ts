import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getServerEnv } from '@/lib/env'

let cached: SupabaseClient | null = null

// Khoá service role bỏ qua RLS. Module này có 'server-only' nên build sẽ hỏng
// nếu vô tình import vào Client Component.
export function getServiceClient(): SupabaseClient {
  if (cached) return cached
  const env = getServerEnv()
  cached = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
