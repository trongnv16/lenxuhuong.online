import 'server-only'
import { getServiceClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import type { Bid, BidStatus, Profile } from '@/lib/types'

export async function fetchVisibleProfiles(): Promise<Profile[]> {
  const { data, error } = await getServiceClient()
    .from('profiles')
    .select('*')
    .eq('is_hidden', false)
    .order('amount', { ascending: false })
    .order('first_ranked_at', { ascending: true })

  if (error) throw new Error(`Không đọc được bảng xếp hạng: ${error.message}`)
  return (data ?? []) as Profile[]
}

export async function fetchProfileBySocialUrl(url: string): Promise<Profile | null> {
  const { data, error } = await getServiceClient()
    .from('profiles')
    .select('*')
    .eq('social_url', url)
    .maybeSingle()

  if (error) throw new Error(`Không đọc được profile: ${error.message}`)
  return (data as Profile | null) ?? null
}

export async function fetchBidByRefCode(refCode: string): Promise<Bid | null> {
  const { data, error } = await getServiceClient()
    .from('bids')
    .select('*')
    .eq('ref_code', refCode)
    .maybeSingle()

  if (error) throw new Error(`Không đọc được bid: ${error.message}`)
  return (data as Bid | null) ?? null
}

export async function fetchBidsByStatus(status: BidStatus): Promise<Bid[]> {
  const { data, error } = await getServiceClient()
    .from('bids')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Không đọc được danh sách bid: ${error.message}`)
  return (data ?? []) as Bid[]
}

export function avatarPublicUrl(path: string): string {
  const env = getServerEnv()
  return `${env.supabaseUrl}/storage/v1/object/public/avatars/${path}`
}

export async function receiptSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await getServiceClient()
    .storage.from('receipts')
    .createSignedUrl(path, 60)

  if (error) return null
  return data?.signedUrl ?? null
}
