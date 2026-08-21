-- Bảng danh tính công khai
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  social_url text not null unique,
  platform text not null check (
    platform in ('tiktok','facebook','instagram','threads','x','youtube','other')
  ),
  handle text,
  display_name text not null check (char_length(display_name) between 1 and 50),
  bio text not null check (char_length(bio) between 1 and 200),
  avatar_path text not null,
  amount integer not null check (amount > 0),
  first_ranked_at timestamptz not null default now(),
  ranked_at timestamptz not null default now(),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- Bảng lịch sử giao dịch
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  ref_code text not null unique,
  amount integer not null check (amount > 0),
  received_amount integer check (received_amount > 0),
  status text not null default 'pending' check (
    status in ('pending','awaiting_review','approved','rejected')
  ),
  social_url text not null,
  platform text not null,
  handle text,
  display_name text not null,
  bio text not null,
  avatar_path text not null,
  receipt_path text,
  reject_reason text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz
);

-- Chỉ mục phục vụ truy vấn bảng xếp hạng
create index if not exists profiles_leaderboard_idx
  on public.profiles (is_hidden, amount desc, first_ranked_at asc);

-- Chỉ mục phục vụ trang admin
create index if not exists bids_review_idx
  on public.bids (status, created_at desc);

alter table public.profiles enable row level security;
alter table public.bids enable row level security;

-- Khách chỉ đọc được profile chưa bị ẩn. Mọi thao tác ghi đi qua service role,
-- vốn bỏ qua RLS, nên không cần policy ghi.
drop policy if exists "public_read_visible_profiles" on public.profiles;
create policy "public_read_visible_profiles"
  on public.profiles for select
  to anon
  using (is_hidden = false);

-- Không có policy nào cho bảng bids: khách không đọc được gì.
