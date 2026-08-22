-- Đếm số lần khách bấm vào link mạng xã hội của một profile trên bảng xếp hạng.
alter table public.profiles
  add column if not exists click_count integer not null default 0;

-- Tăng atomic ở tầng DB thay vì đọc rồi ghi ở tầng ứng dụng, để hai request
-- đồng thời (nhiều tab, nhiều khách) không giẫm lên nhau và làm mất lượt đếm.
create or replace function public.increment_profile_click(p_profile_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set click_count = click_count + 1
  where id = p_profile_id and is_hidden = false;
$$;
