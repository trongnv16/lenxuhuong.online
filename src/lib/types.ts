export type Platform =
  | 'tiktok'
  | 'facebook'
  | 'instagram'
  | 'threads'
  | 'x'
  | 'youtube'
  | 'other'

export type BidStatus = 'pending' | 'awaiting_review' | 'approved' | 'rejected'

export type Profile = {
  id: string
  social_url: string
  platform: Platform
  handle: string | null
  display_name: string
  bio: string | null
  avatar_path: string | null
  amount: number
  click_count: number
  first_ranked_at: string
  ranked_at: string
  is_hidden: boolean
  created_at: string
}

export type Bid = {
  id: string
  profile_id: string | null
  ref_code: string
  amount: number
  received_amount: number | null
  status: BidStatus
  social_url: string
  platform: Platform
  handle: string | null
  display_name: string
  bio: string | null
  avatar_path: string | null
  receipt_path: string | null
  reject_reason: string | null
  created_at: string
  submitted_at: string | null
  reviewed_at: string | null
}
